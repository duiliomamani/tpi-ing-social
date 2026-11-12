import gc
import os
import threading
import time
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import librosa
import numpy as np
import soundfile as sf
import torch

from app.adapters.base import BaseTTSAdapter
from app.adapters.perth_adapter import PerThWatermarkAdapter
from app.core.config import settings


class GenerationInProgressError(RuntimeError):
    """Raised when this local model is already synthesizing another request."""


class F5TTSAdapter(BaseTTSAdapter):
    """Local Spanish F5-TTS inference conditioned on an authorized voice sample."""

    MODEL_NAME = "F5TTS_Base"
    CHECKPOINT_NAME = "model_1200000.safetensors"

    def __init__(self, watermarker: Optional[PerThWatermarkAdapter] = None):
        self.device = self._select_device()
        configured_model_dir = os.getenv("F5_TTS_MODEL_DIR")
        self.model_dir = Path(configured_model_dir) if configured_model_dir else settings.WEIGHTS_DIR / "f5-spanish"
        self.checkpoint_path = self.model_dir / self.CHECKPOINT_NAME
        self.vocab_path = self.model_dir / "vocab.txt"
        self.tts = None
        self.watermarker = watermarker
        self._inference_lock = threading.Lock()
        self._init_error: Optional[str] = None
        self._init_f5_tts()
        if (
            self.tts is None
            and self.device == "mps"
            and self._init_error
            and "out of memory" in self._init_error.lower()
        ):
            print("[F5TTSAdapter] MPS sin memoria durante la carga; intentando inicializar en CPU.")
            self._reload_on_cpu()

    @staticmethod
    def _select_device() -> str:
        preference = os.getenv("F5_TTS_DEVICE", "auto").strip().lower()
        if preference == "cpu":
            return "cpu"
        if preference == "mps":
            if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
                return "mps"
            return "cpu"
        if preference == "cuda":
            return "cuda" if torch.cuda.is_available() else "cpu"
        if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            return "mps"
        if torch.cuda.is_available():
            return "cuda"
        return "cpu"

    @property
    def engine_name(self) -> str:
        return "F5-TTS Español (jpgallegoar/F5-Spanish)"

    def _init_f5_tts(self) -> None:
        missing = [
            str(path.name)
            for path in (self.checkpoint_path, self.vocab_path)
            if not path.is_file()
        ]
        if missing:
            self._init_error = (
                f"Faltan archivos del modelo español en {self.model_dir}: {', '.join(missing)}. "
                "Descárguelos con `backend/.venv/bin/python scripts/download_f5_spanish.py`."
            )
            return

        try:
            from f5_tts.api import F5TTS

            self.tts = F5TTS(
                model=self.MODEL_NAME,
                ckpt_file=str(self.checkpoint_path),
                vocab_file=str(self.vocab_path),
                device=self.device,
                hf_cache_dir=str(settings.WEIGHTS_DIR / "huggingface"),
            )
            print(f"[F5TTSAdapter] {self.engine_name} cargado en {self.device}")
        except Exception as exc:
            self.tts = None
            self._init_error = f"No se pudo inicializar F5-TTS: {exc}"
            print(f"[F5TTSAdapter] {self._init_error}")

    def is_available(self) -> Tuple[bool, str]:
        if self.tts is not None:
            return True, f"{self.engine_name} listo en {self.device}; requiere audio y transcripción de referencia."
        return False, self._init_error or "F5-TTS no está disponible."

    @staticmethod
    def _is_mps_out_of_memory(error: RuntimeError) -> bool:
        message = str(error).lower()
        return "out of memory" in message and "mps" in message

    def _reload_on_cpu(self) -> bool:
        """Release MPS allocations and reload once on CPU after an MPS OOM."""
        self.tts = None
        gc.collect()
        mps = getattr(torch, "mps", None)
        if mps is not None and hasattr(mps, "empty_cache"):
            try:
                mps.empty_cache()
            except Exception as exc:
                print(f"[F5TTSAdapter] No se pudo vaciar la caché MPS: {exc}")

        self.device = "cpu"
        self._init_error = None
        self._init_f5_tts()
        return self.tts is not None

    @staticmethod
    def _median_f0(audio: np.ndarray, sample_rate: int) -> Optional[float]:
        if audio.size == 0:
            return None
        try:
            # YIN is cheaper than pYIN and F0 is diagnostic only for this model.
            analysis_audio = audio[: sample_rate * 30]
            f0 = librosa.yin(
                analysis_audio,
                fmin=65,
                fmax=400,
                sr=sample_rate,
                frame_length=2048,
                hop_length=512,
            )
            return float(np.median(f0)) if len(f0) else None
        except Exception as exc:
            print(f"[F5TTSAdapter] No se pudo medir F0: {exc}")
            return None

    def _clean_reference(
        self,
        ref_path: str,
        temp_clean_path: str,
        reference_transcript: str,
    ) -> Dict[str, Any]:
        """Trim edge silence and reject references that F5 would silently truncate."""
        source_info = sf.info(ref_path)
        if source_info.duration > settings.MAX_VOICE_REFERENCE_DURATION_SECONDS:
            raise ValueError(
                f"La referencia dura {source_info.duration:.1f} s; F5-TTS admite como máximo "
                f"{settings.MAX_VOICE_REFERENCE_DURATION_SECONDS:.0f} s. Recorte una frase "
                "y use su transcripción exacta."
            )

        audio, sample_rate = librosa.load(
            ref_path,
            sr=settings.TARGET_SAMPLE_RATE,
            mono=True,
        )
        if audio.size == 0:
            raise ValueError("La muestra de referencia no contiene audio.")

        trimmed, _ = librosa.effects.trim(audio, top_db=28)
        clean_audio = trimmed if trimmed.size >= int(0.5 * sample_rate) else audio
        if clean_audio.size > int(settings.MAX_VOICE_REFERENCE_DURATION_SECONDS * sample_rate):
            raise ValueError(
                "La voz clara supera los 12 s. Recorte un fragmento más breve y vuelva a cargarlo."
            )
        if clean_audio.size < sample_rate:
            raise ValueError("La referencia debe contener al menos un segundo de voz clara.")

        clean_duration = len(clean_audio) / sample_rate
        transcript_bytes_per_second = (
            len(reference_transcript.strip().encode("utf-8")) / clean_duration
        )
        if not 2.0 <= transcript_bytes_per_second <= 35.0:
            raise ValueError(
                "La duración de la muestra no parece coincidir con su transcripción. "
                "Use un clip de 5–12 s con voz clara y escriba exactamente todo lo que se dice."
            )

        sf.write(temp_clean_path, clean_audio, sample_rate, subtype="PCM_16")
        return {
            "median_f0": self._median_f0(clean_audio, sample_rate),
            "duration_seconds": clean_duration,
            "clean_ref_path": temp_clean_path,
        }

    @staticmethod
    def _to_numpy(audio: Any) -> np.ndarray:
        if isinstance(audio, torch.Tensor):
            audio = audio.detach().float().cpu().numpy()
        waveform = np.asarray(audio, dtype=np.float32).squeeze()
        if waveform.ndim != 1:
            raise ValueError(f"F5-TTS devolvió una forma de audio no soportada: {waveform.shape}")
        if waveform.size == 0:
            raise ValueError("F5-TTS devolvió un audio vacío.")
        return waveform

    def synthesize(
        self,
        text: str,
        reference_audio_path: Optional[str],
        output_path: str,
        consent_granted: bool,
        apply_watermark: bool = True,
        reference_transcript: str = "",
        cfg_strength: float = 2.0,
        nfe_step: int = 16,
        speed: float = 1.0,
    ) -> Dict[str, Any]:
        if not consent_granted:
            raise PermissionError(
                "Se requiere el consentimiento expreso e informado del titular de la voz "
                "para ejecutar la clonación."
            )
        if self.tts is None:
            raise RuntimeError(self._init_error or "F5-TTS no está disponible.")
        if not reference_audio_path or not os.path.isfile(reference_audio_path):
            raise ValueError("F5-TTS requiere una muestra de voz de referencia cargada.")
        if not reference_transcript.strip():
            raise ValueError("Escriba la transcripción literal de la muestra de referencia.")
        if not text.strip():
            raise ValueError("Ingrese el texto que desea sintetizar.")

        started_at = time.time()
        output = Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)
        temp_clean_ref = str(output.with_name(f"{output.stem}_clean_ref.wav"))
        ref_profile: Dict[str, Any] = {"median_f0": None, "clean_ref_path": None}
        if not self._inference_lock.acquire(blocking=False):
            raise GenerationInProgressError(
                "F5-TTS ya está generando otro audio en este laboratorio. Espere a que termine."
            )

        try:
            ref_profile = self._clean_reference(
                reference_audio_path,
                temp_clean_ref,
                reference_transcript,
            )
            infer_args = {
                "ref_file": ref_profile["clean_ref_path"],
                "ref_text": reference_transcript.strip(),
                "gen_text": text.strip(),
                "cfg_strength": cfg_strength,
                "nfe_step": nfe_step,
                "speed": speed,
            }
            try:
                inference = self.tts.infer(**infer_args)
            except RuntimeError as exc:
                if not self._is_mps_out_of_memory(exc) or self.device != "mps":
                    raise
                print("[F5TTSAdapter] MPS sin memoria; liberando MPS y reintentando una vez en CPU.")
                exc.__traceback__ = None
                if not self._reload_on_cpu():
                    raise RuntimeError(self._init_error or "F5-TTS no pudo recargarse en CPU.") from None
                inference = self.tts.infer(**infer_args)

            waveform, output_sample_rate, _ = inference
            waveform = self._to_numpy(waveform)
            output_sample_rate = int(output_sample_rate)
            sf.write(output_path, waveform, output_sample_rate, subtype="PCM_16")

            watermark_embedded = False
            if apply_watermark:
                if self.watermarker is None:
                    self.watermarker = PerThWatermarkAdapter()
                watermarked_path = str(output.with_name(f"{output.stem}_watermarked.wav"))
                if self.watermarker.embed_watermark(
                    output_path,
                    watermarked_path,
                    payload="VOICESHIELD_F5_TTS_AUTHORIZED",
                ) and os.path.isfile(watermarked_path):
                    os.replace(watermarked_path, output_path)
                    watermark_embedded = True
                elif os.path.exists(watermarked_path):
                    os.remove(watermarked_path)

            generated_f0 = self._median_f0(waveform, output_sample_rate)
            info = sf.info(output_path)
            return {
                "output_path": output_path,
                "duration_seconds": round(float(info.duration), 2),
                "sample_rate": int(info.samplerate),
                "creator_model": (
                    f"{self.engine_name} — clonación condicionada por referencia autorizada en {self.device}"
                ),
                "is_synthetic": True,
                "watermark_embedded": watermark_embedded,
                "academic_banner": settings.SYNTHETIC_AUDIO_BANNER,
                "generation_time_ms": round((time.time() - started_at) * 1000, 2),
                "ref_pitch_hz": round(ref_profile["median_f0"], 1)
                if ref_profile.get("median_f0") is not None
                else None,
                "cloned_pitch_hz": round(generated_f0, 1) if generated_f0 is not None else None,
                "pitch_correction_semitones": None,
            }
        finally:
            if os.path.exists(temp_clean_ref):
                try:
                    os.remove(temp_clean_ref)
                except OSError:
                    pass
            self._inference_lock.release()
