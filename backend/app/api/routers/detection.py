import os
import uuid
import soundfile as sf
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.core.config import settings
from app.models.schemas import AudioAnalysisResponse
from app.services.audio_detection_service import audio_detection_service
from app.core.database import save_audio_record

router = APIRouter(prefix="/detection", tags=["Detección Acústica y Procedencia"])

@router.post("/analyze-file", response_model=AudioAnalysisResponse)
async def analyze_uploaded_audio(file: UploadFile = File(...)):
    """
    Analiza un archivo de audio cargado desde el micrófono o disco:
    - Validación y normalización
    - Detección AASIST (Deepfake audio score)
    - Detección de marca de agua PerTh
    - Extracción de forma de onda y espectrograma
    """
    if not file.filename.lower().endswith((".wav", ".mp3", ".ogg", ".flac", ".m4a")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de audio no compatible. Use WAV o MP3."
        )

    audio_id = f"aud_{uuid.uuid4().hex[:10]}"
    dest_path = settings.UPLOADS_DIR / f"{audio_id}.wav"

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="El archivo supera el límite de 25 MB."
        )

    with open(dest_path, "wb") as f:
        f.write(content)

    try:
        # Guardar registro inicial
        info = sf.info(str(dest_path))
        save_audio_record(
            audio_id=audio_id,
            filename=file.filename,
            filepath=str(dest_path),
            original_name=file.filename,
            sample_rate=int(info.samplerate),
            duration=float(info.duration),
            is_synthetic=False,
            watermark_detected=False,
            creator_model="external_upload",
            consent_granted=True
        )

        # Ejecutar pipeline forense
        response = audio_detection_service.analyze_audio_file(str(dest_path), audio_id)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al analizar el audio: {str(e)}"
        )

@router.get("/analyze-sample/{sample_name}", response_model=AudioAnalysisResponse)
def analyze_preloaded_sample(sample_name: str):
    """
    Analiza una muestra de audio del laboratorio (ej: scenario_a.wav).
    """
    candidate_paths = [
        settings.AUDIO_SAMPLES_DIR / sample_name,
        settings.UPLOADS_DIR / sample_name,
        settings.AUDIO_SAMPLES_DIR / f"{sample_name}.wav"
    ]
    
    target_path = None
    for p in candidate_paths:
        if p.exists():
            target_path = p
            break

    if not target_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Muestra de audio '{sample_name}' no encontrada."
        )

    audio_id = target_path.stem
    return audio_detection_service.analyze_audio_file(str(target_path), audio_id)
