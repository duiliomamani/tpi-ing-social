"""HTTP adapter for the cross-platform Qwen3-TTS PyTorch service."""

import base64
import json
import os
import time
from pathlib import Path
from typing import Any, Callable, Dict, Optional, Tuple

import httpx
import numpy as np
import soundfile as sf

from app.adapters.base import BaseTTSAdapter
from app.core.config import ensure_data_directories, settings


class QwenTTSAdapter(BaseTTSAdapter):
    """Generate authorized voice clones through the local Docker service."""

    def __init__(self, watermarker=None):
        self.engine_name = "Qwen3-TTS 0.6B · PyTorch (Docker)"
        self.device = "CPU · servicio Qwen3-TTS en Docker Compose"
        self.watermarker = watermarker
        self.base_url = settings.QWEN_TTS_BASE_URL.rstrip("/")

    def is_available(self) -> Tuple[bool, str]:
        try:
            with httpx.Client(timeout=2.0) as client:
                response = client.get(f"{self.base_url}/health")
                response.raise_for_status()
                status = response.json()
            return bool(status.get("available")), str(status.get("message", "Qwen3-TTS no disponible."))
        except Exception as exc:
            return False, f"No se pudo conectar con Qwen3-TTS local: {exc}"

    @staticmethod
    def _progress(callback: Optional[Callable[[str], None]], message: str) -> None:
        if callback:
            callback(message)

    def synthesize(
        self,
        text: str,
        reference_audio_path: Optional[str],
        output_path: str,
        consent_granted: bool,
        apply_watermark: bool = True,
        reference_transcript: Optional[str] = None,
        progress_callback: Optional[Callable[[str], None]] = None,
    ) -> Dict[str, Any]:
        if not consent_granted:
            raise PermissionError("Se requiere autorización declarada para sintetizar esta voz.")
        if not reference_audio_path or not Path(reference_audio_path).is_file():
            raise ValueError("No se encontró el audio de referencia cargado.")
        if not reference_transcript or not reference_transcript.strip():
            raise ValueError("La transcripción literal de la referencia es obligatoria.")
        clean_text = " ".join(text.split())
        clean_reference_text = " ".join(reference_transcript.split())
        if not clean_text or len(clean_text) > 400:
            raise ValueError("El texto de síntesis debe contener entre 1 y 400 caracteres.")
        try:
            reference_info = sf.info(reference_audio_path)
        except Exception as exc:
            raise ValueError("No se pudieron leer los metadatos de la referencia de voz.") from exc
        if not 3.0 <= float(reference_info.duration) <= settings.MAX_VOICE_REFERENCE_DURATION_SECONDS:
            raise ValueError("La referencia de Qwen3-TTS debe durar entre 3 y 12 segundos.")

        started_at = time.monotonic()
        self._progress(progress_callback, "Conectando con Qwen3-TTS local…")
        reference_bytes = Path(reference_audio_path).read_bytes()
        payload = {
            "text": clean_text,
            "reference_audio_base64": base64.b64encode(reference_bytes).decode("ascii"),
            "reference_transcript": clean_reference_text,
        }
        headers = {"X-API-Key": settings.QWEN_TTS_API_KEY} if settings.QWEN_TTS_API_KEY else {}
        chunks = []
        sample_rate = 24000
        received_chunk = False

        try:
            timeout = httpx.Timeout(360.0, connect=5.0)
            with httpx.Client(timeout=timeout) as client:
                with client.stream(
                    "POST",
                    f"{self.base_url}/synthesize/stream",
                    json=payload,
                    headers=headers,
                ) as response:
                    if response.status_code != 200:
                        detail = response.read().decode("utf-8", errors="replace")
                        raise RuntimeError(detail[:500] or "Qwen3-TTS rechazó la síntesis.")
                    for line in response.iter_lines():
                        if not line:
                            continue
                        event = json.loads(line)
                        event_type = event.get("event")
                        if event_type == "start":
                            self._progress(progress_callback, "Qwen3-TTS está generando la voz…")
                        elif event_type == "error":
                            raise RuntimeError(str(event.get("message", "Error durante la síntesis con Qwen3-TTS.")))
                        elif event_type == "chunk":
                            chunk_rate = int(event.get("sample_rate", sample_rate))
                            if received_chunk and chunk_rate != sample_rate:
                                raise RuntimeError("Qwen3-TTS devolvió fragmentos con frecuencias de muestreo distintas.")
                            sample_rate = chunk_rate
                            audio = np.frombuffer(base64.b64decode(event["audio_base64"], validate=True), dtype="<f4")
                            if audio.size:
                                chunks.append(audio.copy())
                                received_chunk = True
                                self._progress(progress_callback, "Audio completo recibido desde Qwen3-TTS.")
                        elif event_type == "complete":
                            break
        except httpx.HTTPError as exc:
            raise RuntimeError(f"No se pudo completar la síntesis local de Qwen3-TTS: {exc}") from exc

        if not chunks:
            raise RuntimeError("Qwen3-TTS terminó sin devolver audio.")

        ensure_data_directories()
        final_path = Path(output_path)
        final_path.parent.mkdir(parents=True, exist_ok=True)
        raw_path = final_path.with_name(f"{final_path.stem}.unmarked.wav")
        audio = np.concatenate(chunks)
        sf.write(str(raw_path), audio, sample_rate, format="WAV", subtype="PCM_16")

        watermark_embedded = False
        if apply_watermark and self.watermarker:
            try:
                watermark_embedded = bool(self.watermarker.embed_watermark(
                    str(raw_path),
                    str(final_path),
                    payload="VOICESHIELD_QWEN_TTS_AUTHORIZED",
                ))
            except Exception as exc:
                print(f"No se pudo agregar marca de procedencia a Qwen3-TTS: {exc}")

        if watermark_embedded:
            raw_path.unlink(missing_ok=True)
        else:
            os.replace(raw_path, final_path)

        self._progress(progress_callback, "Audio Qwen3-TTS guardado.")
        return {
            "duration_seconds": round(len(audio) / sample_rate, 2),
            "sample_rate": sample_rate,
            "creator_model": self.engine_name,
            "watermark_embedded": watermark_embedded,
            "academic_banner": settings.SYNTHETIC_AUDIO_BANNER,
            "generation_time_ms": round((time.monotonic() - started_at) * 1000, 2),
        }
