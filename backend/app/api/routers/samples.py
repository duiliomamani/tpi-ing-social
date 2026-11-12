from typing import List

from fastapi import APIRouter

from app.models.schemas import LabAudioSample
from app.services.scenario_service import scenario_service

router = APIRouter(prefix="/samples", tags=["Muestras de Evaluación"])


@router.get("", response_model=List[LabAudioSample])
def get_lab_audio_samples():
    """Return the prerecorded audio samples used by detection and risk analysis."""
    return scenario_service.get_all_scenarios()
