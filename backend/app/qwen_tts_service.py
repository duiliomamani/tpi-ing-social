"""Cross-platform PyTorch service for local Qwen3-TTS voice cloning."""

import base64
import json
import os
import secrets
import tempfile
import threading
from pathlib import Path
from typing import Iterator

import numpy as np
import soundfile as sf
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.config import settings


app = FastAPI(title="VoiceShield local Qwen3-TTS runtime", version="2.0.0")
_model = None
_model_lock = threading.Lock()
_generation_lock = threading.Lock()
_model_loading = False
_model_error = ""


class QwenTTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=400)
    reference_audio_base64: str = Field(min_length=1, max_length=8 * 1024 * 1024)
    reference_transcript: str = Field(min_length=1, max_length=800)


def require_api_key(x_api_key: str = Header(default="")) -> None:
    expected = settings.QWEN_TTS_API_KEY
    if expected and not secrets.compare_digest(x_api_key, expected):
        raise HTTPException(status_code=403, detail="Clave local del sintetizador inválida.")


def _get_model():
    global _model, _model_loading, _model_error
    if _model is not None:
        return _model
    with _model_lock:
        if _model is None:
            _model_loading = True
            _model_error = ""
            try:
                import torch
                from qwen_tts import Qwen3TTSModel

                thread_count = max(1, int(os.getenv("QWEN_TTS_CPU_THREADS", "4")))
                torch.set_num_threads(thread_count)
                _model = Qwen3TTSModel.from_pretrained(
                    settings.QWEN_TTS_MODEL,
                    device_map="cpu",
                    dtype=torch.float32,
                )
                _model_error = ""
            except Exception as exc:
                _model_error = str(exc).replace("\n", " ")[:400]
                raise RuntimeError(
                    "No se pudo descargar o cargar Qwen3-TTS. Revise la conexión y la memoria disponibles."
                ) from exc
            finally:
                _model_loading = False
    return _model


def _generate_audio(text: str, reference_path: str, reference_text: str):
    model = _get_model()
    waveforms, sample_rate = model.generate_voice_clone(
        text=text,
        language="Spanish",
        ref_audio=reference_path,
        ref_text=reference_text,
    )
    if not waveforms:
        raise RuntimeError("Qwen3-TTS terminó sin devolver audio.")

    waveform = waveforms[0]
    if hasattr(waveform, "detach"):
        waveform = waveform.detach().cpu().numpy()
    audio = np.asarray(waveform, dtype=np.float32).reshape(-1)
    if not audio.size:
        raise RuntimeError("Qwen3-TTS devolvió un audio vacío.")
    return audio, int(sample_rate)


@app.get("/health")
def health():
    global _model_error
    try:
        import qwen_tts  # noqa: F401
        runtime_available = True
    except ImportError as exc:
        runtime_available = False
        _model_error = str(exc).replace("\n", " ")[:400]

    if not runtime_available:
        message = "No está instalado el paquete qwen-tts en el contenedor."
    elif _model is not None:
        message = "Qwen3-TTS 0.6B está cargado en CPU dentro de Docker."
    elif _model_loading:
        message = "Qwen3-TTS está descargando o cargando los pesos para la primera síntesis."
    elif _model_error:
        message = f"No se pudo cargar Qwen3-TTS: {_model_error}"
    else:
        message = "Servicio disponible; los pesos se descargan y cargan al solicitar la primera síntesis."

    return {
        "available": runtime_available and not _model_error,
        "model_loaded": _model is not None,
        "model_loading": _model_loading,
        "model": settings.QWEN_TTS_MODEL,
        "device": "cpu",
        "message": message,
    }


@app.post("/synthesize/stream")
def stream_speech(request: QwenTTSRequest, _: None = Depends(require_api_key)):
    clean_text = " ".join(request.text.split())
    reference_text = " ".join(request.reference_transcript.split())
    try:
        reference_bytes = base64.b64decode(request.reference_audio_base64, validate=True)
    except Exception as exc:
        raise HTTPException(status_code=422, detail="El audio de referencia está mal codificado.") from exc
    if len(reference_bytes) > settings.MAX_CALL_SIMULATION_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="El recorte de referencia supera el límite local de 5 MB.")

    def events() -> Iterator[bytes]:
        reference_path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", prefix="voiceshield-ref-", delete=False) as reference_file:
                reference_file.write(reference_bytes)
                reference_path = Path(reference_file.name)
            duration = float(sf.info(str(reference_path)).duration)
            if duration < 3.0 or duration > settings.MAX_VOICE_REFERENCE_DURATION_SECONDS:
                raise ValueError("El recorte de referencia debe durar entre 3 y 12 segundos.")

            yield (json.dumps({"event": "start", "sample_rate": 24000}) + "\n").encode()
            with _generation_lock:
                audio, sample_rate = _generate_audio(clean_text, str(reference_path), reference_text)
            encoded = base64.b64encode(audio.astype("<f4", copy=False).tobytes()).decode("ascii")
            yield (json.dumps({
                "event": "chunk",
                "audio_base64": encoded,
                "sample_rate": sample_rate,
            }) + "\n").encode()
            yield b'{"event":"complete"}\n'
        except Exception as exc:
            detail = str(exc).replace("\n", " ")[:500]
            yield (json.dumps({"event": "error", "message": detail}) + "\n").encode()
        finally:
            if reference_path is not None:
                reference_path.unlink(missing_ok=True)

    return StreamingResponse(events(), media_type="application/x-ndjson")
