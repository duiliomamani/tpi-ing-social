import os
import uuid
import soundfile as sf
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from app.core.config import settings
from app.models.schemas import VoiceGenerationRequest, VoiceGenerationResponse
from app.services.voice_generation_service import voice_generation_service

router = APIRouter(prefix="/generation", tags=["Laboratorio de Generación"])

@router.post("/upload-reference")
async def upload_voice_reference(
    file: UploadFile = File(...),
    consent_granted: bool = Form(...)
):
    """
    Carga de muestra WAV de referencia para clonación.
    Exige consentimiento expreso para almacenamiento y procesamiento.
    """
    if not consent_granted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere autorización expresa del titular para cargar muestras de voz en el laboratorio."
        )

    if not file.filename.lower().endswith((".wav", ".mp3", ".ogg")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato no admitido. Utilice archivos WAV o MP3."
        )

    ref_id = f"ref_{uuid.uuid4().hex[:10]}"
    dest_path = settings.UPLOADS_DIR / f"{ref_id}.wav"

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="El archivo excede el tamaño máximo permitido (25 MB)."
        )

    with open(dest_path, "wb") as f:
        f.write(content)

    # Validar propiedades de audio
    try:
        info = sf.info(str(dest_path))
        duration = round(float(info.duration), 2)
        sample_rate = int(info.samplerate)
        channels = int(info.channels)
    except Exception as e:
        if os.path.exists(dest_path):
            os.remove(dest_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se pudo decodificar el archivo de audio: {str(e)}"
        )

    return {
        "reference_id": ref_id,
        "filename": file.filename,
        "duration_seconds": duration,
        "sample_rate": sample_rate,
        "channels": channels,
        "status": "Referencia de voz cargada y perfilada exitosamente.",
        "consent_verified": True
    }

@router.post("/synthesize", response_model=VoiceGenerationResponse)
def synthesize_cloned_voice(request: VoiceGenerationRequest):
    """
    Ejecuta la inferencia de clonación y síntesis de voz con Chatterbox Multilingual V3.
    """
    if not request.consent_granted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ACCESO DENEGADO: No se autoriza la generación sintética sin consentimiento expreso."
        )

    try:
        response = voice_generation_service.generate_voice(
            text=request.text,
            reference_audio_id=request.reference_audio_id,
            consent_granted=request.consent_granted,
            speaker_alias=request.speaker_alias,
            apply_perth_watermark=request.apply_perth_watermark
        )
        return response
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la síntesis de audio: {str(e)}"
        )
