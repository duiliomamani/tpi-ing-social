import os
import uuid
import soundfile as sf
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from app.core.config import ensure_data_directories, settings
from app.models.schemas import AudioAnalysisResponse
from app.services.audio_detection_service import audio_detection_service
from app.services.audio_processing import normalize_audio_to_wav
from app.core.database import save_audio_record
from app.services.scenario_service import scenario_service

router = APIRouter(prefix="/detection", tags=["Detector Acústico Experimental y Procedencia"])

@router.post("/analyze-file", response_model=AudioAnalysisResponse)
async def analyze_uploaded_audio(
    file: UploadFile = File(...),
    consent_declared: bool = Form(...),
):
    """
    Analiza un archivo de audio cargado desde el micrófono o disco:
    - Validación y normalización con FFmpeg a 16kHz WAV mono
    - Baseline acústico experimental de VoiceShield (score no calibrado)
    - Consulta de la marca de procedencia disponible
    - Extracción de forma de onda y espectrograma
    """
    if not consent_declared:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El operador debe declarar autorización para analizar este audio.",
        )
    audio_id = f"aud_{uuid.uuid4().hex[:10]}"
    dest_path = settings.UPLOADS_DIR / f"{audio_id}.wav"
    raw_tmp_path = settings.UPLOADS_DIR / f"{audio_id}_raw"

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="El archivo supera el límite de 100 MB."
        )

    ensure_data_directories()
    with open(raw_tmp_path, "wb") as f:
        f.write(content)

    # Normalizar usando FFmpeg
    norm_ok = normalize_audio_to_wav(str(raw_tmp_path), str(dest_path))
    if os.path.exists(raw_tmp_path):
        os.remove(raw_tmp_path)

    if not norm_ok or not os.path.exists(dest_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de audio no reconocido o dañado. Verifique el archivo cargado."
        )

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
            consent_granted=consent_declared
        )

        # Ejecutar análisis acústico experimental
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
    safe_name = Path(sample_name).name
    if not safe_name or safe_name != sample_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nombre de archivo inválido.")

    scenario = scenario_service.get_scenario_by_id(Path(safe_name).stem)
    if scenario:
        if not scenario.audio_available:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=scenario.availability_note)
        candidate_paths = [settings.AUDIO_SAMPLES_DIR / scenario.audio_file]
    else:
        candidate_paths = [
            settings.AUDIO_SAMPLES_DIR / safe_name,
            settings.UPLOADS_DIR / safe_name,
            settings.AUDIO_SAMPLES_DIR / f"{safe_name}.wav"
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
