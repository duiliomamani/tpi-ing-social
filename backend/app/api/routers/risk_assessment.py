from typing import Optional
from pathlib import Path
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.core.config import settings
from app.models.schemas import MultilayerRiskAssessmentResponse
from app.services.audio_detection_service import audio_detection_service
from app.services.social_engineering_service import social_engineering_service
from app.services.risk_assessment_service import risk_assessment_service
from app.services.scenario_service import scenario_service
from app.services.transcription_service import transcription_service

router = APIRouter(prefix="/risk-assessment", tags=["Evaluación Multicapa y Confianza"])

class ComprehensiveEvaluationRequest(BaseModel):
    sample_name: str
    verified_identity: bool = False
    custom_transcript: Optional[str] = None

@router.post("/evaluate", response_model=MultilayerRiskAssessmentResponse)
def evaluate_comprehensive_risk(request: ComprehensiveEvaluationRequest):
    """
    Evaluación multicapa completa:
    Dimensiones A/B/C aportan señales exploratorias; D registra manualmente
    si el operador declara una verificación fuera de banda.
    """
    sample_name = request.sample_name
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
            detail=f"Archivo de audio '{sample_name}' no encontrado."
        )

    audio_id = target_path.stem

    # 1. Dimensión A y B: Análisis Acústico y Procedencia
    acoustic_res = audio_detection_service.analyze_audio_file(str(target_path), audio_id)

    # 2. Transcripción: si es un escenario pregrabado o se proveyó texto, usarlo; sino Whisper
    transcript_text = request.custom_transcript
    if not transcript_text:
        scenario = scenario_service.get_scenario_by_id(audio_id)
        if scenario:
            transcript_text = scenario.transcript
        else:
            trans_res = transcription_service.transcribe_audio(str(target_path))
            transcript_text = trans_res.get("transcript", "")

    # 3. Dimensión C: Análisis Semántico con Gemma 3
    social_res = social_engineering_service.analyze(transcript_text, audio_id)

    # 4. Dimensión D y Síntesis: Evaluación Multicapa y Reglas Operativas
    risk_res = risk_assessment_service.evaluate_risk(
        audio_id=audio_id,
        acoustic_analysis=acoustic_res,
        social_analysis=social_res,
        verified_identity=request.verified_identity
    )

    return risk_res
