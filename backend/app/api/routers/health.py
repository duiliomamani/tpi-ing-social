import platform
import torch
from fastapi import APIRouter
from app.core.config import settings
from app.models.schemas import SystemHealthResponse, ModelStatus
from app.adapters.gemma_adapter import GemmaAdapter
from app.services.audio_detection_service import audio_detection_service
from app.services.watermark_detection_service import watermark_detection_service
from app.services.transcription_service import transcription_service
from app.services.voice_generation_service import voice_generation_service
from app.services.call_simulation_service import call_simulation_service

router = APIRouter(prefix="/health", tags=["Salud del Sistema y Modelos"])

# Reuse the loaded adapters. Polling health must not allocate new PyTorch
# models on MPS for every browser refresh.
gemma_adapter = GemmaAdapter()

@router.get("", response_model=SystemHealthResponse)
def get_system_health():
    gemma = gemma_adapter
    whisper = transcription_service.adapter
    acoustic_detector = audio_detection_service.acoustic_adapter
    perth = watermark_detection_service.adapter
    f5_tts = voice_generation_service.tts_adapter
    simulator_status = call_simulation_service.status()

    g_ok, g_msg = gemma.is_available()
    w_ok, w_msg = whisper.is_available()
    a_ok, a_msg = acoustic_detector.is_available()
    p_ok, p_msg = perth.is_available()
    f_ok, f_msg = f5_tts.is_available()

    device_name = "CPU"
    if torch.backends.mps.is_available():
        device_name = "Apple Silicon MPS (Metal Performance Shaders)"
    elif torch.cuda.is_available():
        device_name = f"NVIDIA CUDA ({torch.cuda.get_device_name(0)})"

    models = {
        "ollama_qwen3_5": ModelStatus(
            name=f"Modelo local / Ollama ({settings.OLLAMA_MODEL})",
            available=g_ok and simulator_status["llm_available"],
            status_message=simulator_status["llm_message"] if not g_ok else g_msg,
            device="Local Host (11434)"
        ),
        "qwen3_tts": ModelStatus(
            name="Qwen3-TTS 0.6B · MLX",
            available=simulator_status["tts_available"],
            status_message=simulator_status["tts_message"],
            device="Apple Silicon · servicio local 8001"
        ),
        "faster_whisper": ModelStatus(
            name=f"faster-whisper ({settings.WHISPER_MODEL_SIZE})",
            available=w_ok,
            status_message=w_msg,
            device="CPU (int8)"
        ),
        "acoustic_detector": ModelStatus(
            name="VoiceShield Acoustic Prototype",
            available=a_ok,
            status_message=a_msg,
            device=str(acoustic_detector.device)
        ),
        "perth_watermark": ModelStatus(
            name="Marca de procedencia",
            available=p_ok,
            status_message=p_msg,
            device="CPU"
        ),
        "f5_tts": ModelStatus(
            name=f5_tts.engine_name,
            available=f_ok,
            status_message=f_msg,
            device=f5_tts.device
        )
    }

    hardware = {
        "os": f"{platform.system()} {platform.release()}",
        "architecture": platform.machine(),
        "python_version": platform.python_version(),
        "acceleration": device_name,
        "sample_rate_target": settings.TARGET_SAMPLE_RATE
    }

    return SystemHealthResponse(
        app_name=settings.APP_NAME,
        version=settings.VERSION,
        models=models,
        hardware=hardware
    )
