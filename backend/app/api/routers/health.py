import platform
import torch
from fastapi import APIRouter
from app.core.config import settings
from app.models.schemas import SystemHealthResponse, ModelStatus
from app.adapters.gemma_adapter import GemmaAdapter
from app.adapters.whisper_adapter import FasterWhisperAdapter
from app.services.audio_detection_service import audio_detection_service
from app.services.watermark_detection_service import watermark_detection_service
from app.services.voice_generation_service import voice_generation_service

router = APIRouter(prefix="/health", tags=["Salud del Sistema y Modelos"])

# Reuse the loaded adapters. Polling health must not allocate new PyTorch
# models on MPS for every browser refresh.
gemma_adapter = GemmaAdapter()
whisper_adapter = FasterWhisperAdapter()

@router.get("", response_model=SystemHealthResponse)
def get_system_health():
    gemma = gemma_adapter
    whisper = whisper_adapter
    aasist = audio_detection_service.aasist_adapter
    perth = watermark_detection_service.adapter
    f5_tts = voice_generation_service.tts_adapter

    g_ok, g_msg = gemma.is_available()
    w_ok, w_msg = whisper.is_available()
    a_ok, a_msg = aasist.is_available()
    p_ok, p_msg = perth.is_available()
    f_ok, f_msg = f5_tts.is_available()

    device_name = "CPU"
    if torch.backends.mps.is_available():
        device_name = "Apple Silicon MPS (Metal Performance Shaders)"
    elif torch.cuda.is_available():
        device_name = f"NVIDIA CUDA ({torch.cuda.get_device_name(0)})"

    models = {
        "ollama_gemma3": ModelStatus(
            name="Gemma 3 4B (Ollama)",
            available=g_ok,
            status_message=g_msg,
            device="Local Host (11434)"
        ),
        "faster_whisper": ModelStatus(
            name=f"faster-whisper ({settings.WHISPER_MODEL_SIZE})",
            available=w_ok,
            status_message=w_msg,
            device="CPU (int8)"
        ),
        "aasist_detector": ModelStatus(
            name="AASIST Deepfake Classifier",
            available=a_ok,
            status_message=a_msg,
            device=str(aasist.device)
        ),
        "perth_watermark": ModelStatus(
            name="PerTh Watermark Engine",
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
