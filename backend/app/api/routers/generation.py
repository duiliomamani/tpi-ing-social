import os
import uuid
import soundfile as sf
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from app.core.config import settings
from app.models.schemas import VoiceGenerationRequest, VoiceGenerationResponse
from app.services.voice_generation_service import voice_generation_service
from app.services.audio_processing import normalize_audio_to_wav

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
            detail="El archivo excede el tamaño máximo permitido (25 MB)."
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
        duration = round(float(info.duration), 2)
        sample_rate = int(info.samplerate)
        channels = int(info.channels)
    except Exception as e:
        if os.path.exists(dest_path):
            os.remove(dest_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se pudo leer las propiedades del audio: {str(e)}"
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
