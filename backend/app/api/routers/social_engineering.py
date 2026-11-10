from typing import Optional
from fastapi import APIRouter, HTTPException, status, Body
from pydantic import BaseModel
from app.core.config import settings
from app.models.schemas import SocialEngineeringAnalysisResponse
from app.services.social_engineering_service import social_engineering_service
from app.services.transcription_service import transcription_service

router = APIRouter(prefix="/social-engineering", tags=["Análisis Semántico con Gemma 3"])

class AnalyzeTextRequest(BaseModel):
    transcript: str
    audio_id: Optional[str] = None

@router.post("/analyze-text", response_model=SocialEngineeringAnalysisResponse)
def analyze_text_content(request: AnalyzeTextRequest):
    """
    Ejecuta el análisis defensivo de ingeniería social sobre el texto transcripto
    mediante Ollama Gemma 3 4B con JSON Schema estricto.
    """
    if not request.transcript.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La transcripción a analizar no puede estar vacía."
        )

    try:
        return social_engineering_service.analyze(request.transcript, request.audio_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en el análisis de ingeniería social: {str(e)}"
        )

@router.post("/transcribe-and-analyze/{sample_name}", response_model=SocialEngineeringAnalysisResponse)
def transcribe_and_analyze_audio(sample_name: str):
    """
    Pipeline completo: Whisper (transcripción de voz a texto) -> Gemma 3 4B (análisis semántico).
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

    # 1. Transcripción con Whisper
    trans_res = transcription_service.transcribe_audio(str(target_path))
    transcript_text = trans_res.get("transcript", "")

    # 2. Análisis semántico con Gemma 3
    analysis_res = social_engineering_service.analyze(transcript_text, target_path.stem)
    analysis_res.transcription_engine = trans_res.get("engine", "faster-whisper")
    return analysis_res
