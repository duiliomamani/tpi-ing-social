import os
import uuid
import soundfile as sf
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from app.core.config import settings
from app.models.schemas import (
    VoiceGenerationJobResponse,
    VoiceGenerationRequest,
    VoiceGenerationResponse,
    VoiceReferenceTranscriptionRequest,
    VoiceReferenceTranscriptionResponse,
)
from app.adapters.f5_tts_adapter import GenerationInProgressError
from app.services.voice_generation_service import voice_generation_service
from app.services.voice_generation_job_service import voice_generation_job_service
from app.services.audio_processing import normalize_audio_to_wav
from app.services.voice_reference_service import voice_reference_service

router = APIRouter(prefix="/generation", tags=["Laboratorio de Generación"])

@router.post("/upload-reference")
async def upload_voice_reference(
    file: UploadFile = File(...),
    consent_granted: bool = Form(...)
):
    """
    Carga de muestra WAV de referencia para clonación.
    Exige consentimiento expreso para almacenamiento y procesamiento.
    Normaliza de manera transparente cualquier formato (WebM de navegador, Ogg, MP3, WAV) a WAV PCM 16kHz mono con FFmpeg.
    """
    if not consent_granted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere autorización expresa del titular para cargar muestras de voz en el laboratorio."
        )

    ref_id = f"ref_{uuid.uuid4().hex[:10]}"
    dest_path = settings.UPLOADS_DIR / f"{ref_id}.wav"
    raw_tmp_path = settings.UPLOADS_DIR / f"{ref_id}_raw"

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="El archivo excede el tamaño máximo permitido (100 MB)."
        )

    with open(raw_tmp_path, "wb") as f:
        f.write(content)

    # Normalizar usando FFmpeg a WAV PCM 16-bit 16kHz mono
    norm_ok = normalize_audio_to_wav(str(raw_tmp_path), str(dest_path))
    if os.path.exists(raw_tmp_path):
        os.remove(raw_tmp_path)

    if not norm_ok or not os.path.exists(dest_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo decodificar el archivo de audio. Verifique que sea una grabación o archivo válido."
        )

    # Validar propiedades de audio ya normalizado
    try:
        info = sf.info(str(dest_path))
        audio_duration = float(info.duration)
        duration = round(audio_duration, 2)
        sample_rate = int(info.samplerate)
        channels = int(info.channels)
    except Exception as e:
        if os.path.exists(dest_path):
            os.remove(dest_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se pudo leer las propiedades del audio: {str(e)}"
        )

    if audio_duration > settings.MAX_VOICE_SOURCE_DURATION_SECONDS:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"La grabación dura {duration:.1f} s. El límite para transcribir y preparar "
                f"una referencia es {settings.MAX_VOICE_SOURCE_DURATION_SECONDS / 60:.0f} minutos."
            ),
        )

    if audio_duration < 1.0:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La referencia debe contener al menos un segundo de voz clara.",
        )

    return {
        "reference_id": ref_id,
        "filename": f"{ref_id}.wav",
        "audio_url": f"/api/audio/{ref_id}.wav",
        "duration_seconds": duration,
        "sample_rate": sample_rate,
        "channels": channels,
        "status": (
            "Grabación cargada; se preparará un clip de referencia de 5–12 s al transcribirla."
            if audio_duration > settings.MAX_VOICE_REFERENCE_DURATION_SECONDS
            else "Referencia de voz cargada y lista para transcripción local."
        ),
        "consent_verified": True
    }


@router.post("/transcribe-reference", response_model=VoiceReferenceTranscriptionResponse)
def transcribe_voice_reference(request: VoiceReferenceTranscriptionRequest):
    """Transcribe a source recording locally and prepare a short F5-aligned reference."""
    if not request.consent_granted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere consentimiento expreso para transcribir la muestra de voz.",
        )

    reference_path = settings.UPLOADS_DIR / f"{request.reference_audio_id}.wav"
    if not reference_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró la muestra de referencia cargada.",
        )

    try:
        duration = float(sf.info(str(reference_path)).duration)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"No se pudieron leer los metadatos de la referencia: {exc}",
        )

    if duration > settings.MAX_VOICE_SOURCE_DURATION_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"La grabación dura {duration:.1f} s. El límite para transcripción local es "
                f"{settings.MAX_VOICE_SOURCE_DURATION_SECONDS / 60:.0f} minutos."
            ),
        )
    if duration < 1.0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La referencia debe contener al menos un segundo de voz clara.",
        )

    try:
        result = voice_reference_service.transcribe_and_prepare(
            request.reference_audio_id,
            str(reference_path),
            clip_start_seconds=request.clip_start_seconds,
            clip_end_seconds=request.clip_end_seconds,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )

    return VoiceReferenceTranscriptionResponse(**result)

@router.post("/synthesize", response_model=VoiceGenerationResponse)
def synthesize_cloned_voice(request: VoiceGenerationRequest):
    """
    Sintetiza en español con F5-TTS, condicionado por una muestra autorizada
    y la transcripción literal de esa muestra.
    """
    if not request.consent_granted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ACCESO DENEGADO: No se autoriza la generación sintética sin consentimiento expreso."
        )

    model_available, model_message = voice_generation_service.tts_adapter.is_available()
    if not model_available:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=model_message)

    try:
        response = voice_generation_service.generate_voice(
            text=request.text,
            reference_audio_id=request.reference_audio_id,
            reference_transcript=request.reference_transcript,
            consent_granted=request.consent_granted,
            speaker_alias=request.speaker_alias,
            apply_perth_watermark=request.apply_perth_watermark,
            cfg_strength=request.cfg_strength,
            nfe_step=request.nfe_step,
            speed=request.speed,
        )
        return response
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except GenerationInProgressError as busy:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(busy))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la síntesis de audio: {str(e)}"
        )


@router.post(
    "/synthesize/jobs",
    response_model=VoiceGenerationJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def start_voice_generation_job(request: VoiceGenerationRequest):
    """Start F5-TTS in a background thread and return a pollable job id."""
    if not request.consent_granted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ACCESO DENEGADO: No se autoriza la generación sintética sin consentimiento expreso.",
        )

    model_available, model_message = voice_generation_service.tts_adapter.is_available()
    if not model_available:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=model_message)

    return voice_generation_job_service.start(request)


@router.get(
    "/synthesize/jobs/{job_id}",
    response_model=VoiceGenerationJobResponse,
)
def get_voice_generation_job(job_id: str):
    try:
        return voice_generation_job_service.get(job_id)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró la tarea de generación; iniciá una nueva síntesis.",
        )
