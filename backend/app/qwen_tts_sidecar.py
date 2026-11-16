"""Isolated MLX sidecar for local Qwen3-TTS voice cloning."""

import base64
from concurrent.futures import ThreadPoolExecutor
import json
import math
import secrets
import tempfile
import threading
import time
from pathlib import Path
from typing import Iterator

import numpy as np
import soundfile as sf
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.config import settings


app = FastAPI(title="VoiceShield local Qwen3-TTS runtime", version="1.0.0")
_model = None
_model_lock = threading.Lock()
_generation_lock = threading.Lock()
# MLX Metal streams are thread-local, so load and synthesize on one persistent worker.
_mlx_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="qwen-mlx")
_model_loading = False
_model_error = ""
_last_cache_check = 0.0
_cached_weights = False


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
            try:
                from mlx_audio.tts.utils import load_model
                _model = load_model(settings.QWEN_TTS_MODEL)
                _model_error = ""
            except Exception as exc:
                _model_error = str(exc).replace("\n", " ")[:400]
                raise RuntimeError(
                    "No se pudo cargar Qwen3-TTS. Revise el estado local del modelo y vuelva a iniciar el servicio."
                ) from exc
            finally:
                _model_loading = False
    return _model


def _weights_are_cached() -> bool:
    global _last_cache_check, _cached_weights
    now = time.monotonic()
    if now - _last_cache_check < 15:
        return _cached_weights
    try:
        from huggingface_hub import snapshot_download

        snapshot_download(repo_id=settings.QWEN_TTS_MODEL, local_files_only=True)
        _cached_weights = True
    except Exception:
        _cached_weights = False
    _last_cache_check = now
    return _cached_weights


def _warm_model() -> None:
    try:
        _get_model()
    except Exception as exc:
        print(f"Qwen3-TTS no pudo precargarse: {exc}")


def _generate_audio_chunks(text: str, reference_path: str, reference_text: str):
    """Load, run, and materialize a full utterance on the persistent MLX worker."""
    model = _get_model()
    text_token_count = len(model.tokenizer.encode(text))
    max_tokens = min(512, max(32, math.ceil(text_token_count * 3.5)))
    audio_chunks = []
    for result in model.generate(
        text=text,
        lang_code="Spanish",
        ref_audio=reference_path,
        ref_text=reference_text,
        max_tokens=max_tokens,
        temperature=0.75,
        repetition_penalty=1.1,
        stream=True,
        streaming_interval=1.0,
    ):
        audio = np.asarray(result.audio, dtype=np.float32).reshape(-1)
        if audio.size:
            audio_chunks.append((audio, int(getattr(result, "sample_rate", 24000))))
    return audio_chunks


@app.on_event("startup")
def warm_cached_model() -> None:
    try:
        import mlx_audio  # noqa: F401
    except ImportError:
        return
    if _weights_are_cached():
        _mlx_executor.submit(_warm_model)


@app.get("/health")
def health():
    try:
        import mlx_audio  # noqa: F401
        runtime_available = True
    except ImportError:
        runtime_available = False
    weights_cached = runtime_available and _weights_are_cached()
    available = runtime_available and weights_cached
    if not runtime_available:
        message = "No está instalado mlx-audio en el entorno aislado."
    elif not weights_cached:
        message = "Faltan los pesos locales de Qwen3-TTS; revise la instalación nativa del sintetizador."
    elif _model is not None:
        message = "Qwen3-TTS 0.6B está cargado y listo."
    elif _model_error:
        message = f"No se pudo cargar Qwen3-TTS: {_model_error}"
    elif _model_loading:
        message = "Qwen3-TTS está cargando en memoria para acelerar la primera llamada."
    else:
        message = "Pesos locales disponibles; el modelo se cargará al iniciar la primera llamada."
    return {
        "available": available,
        "model_loaded": _model is not None,
        "model_loading": _model_loading,
        "model": settings.QWEN_TTS_MODEL,
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

    def chunks() -> Iterator[bytes]:
        reference_path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", prefix="voiceshield-ref-", delete=False) as reference_file:
                reference_file.write(reference_bytes)
                reference_path = Path(reference_file.name)
            duration = float(sf.info(str(reference_path)).duration)
            if duration < 3.0 or duration > settings.MAX_VOICE_REFERENCE_DURATION_SECONDS:
                raise ValueError("El recorte de referencia debe durar entre 3 y 12 segundos.")
            with _generation_lock:
                yield (json.dumps({"event": "start", "sample_rate": 24000}) + "\n").encode()
                audio_chunks = _mlx_executor.submit(
                    _generate_audio_chunks,
                    clean_text,
                    str(reference_path),
                    reference_text,
                ).result()
                for audio, sample_rate in audio_chunks:
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

    return StreamingResponse(chunks(), media_type="application/x-ndjson")
