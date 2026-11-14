import os
import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.core.config import settings
from app.models.schemas import ExperimentResult
from app.services.experiment_service import experiment_service
from app.core.database import get_db_connection
from app.services.scenario_service import scenario_service

router = APIRouter(prefix="/experiments", tags=["Laboratorio Comparativo y Robustez"])

class RunBenchmarkRequest(BaseModel):
    human_sample: str = "scenario_c.wav"
    synthetic_sample: str = "scenario_a.wav"

@router.post("/run-benchmark", response_model=ExperimentResult)
def run_reproducible_benchmark(request: RunBenchmarkRequest):
    """
    Ejecuta un benchmark exploratorio sobre C (humana declarada) y A
    (sintética Piper), cada una bajo cuatro transformaciones FFmpeg.
    Las ocho variantes derivan de solo dos grabaciones fuente.
    """
    if request.human_sample != "scenario_c.wav" or request.synthetic_sample != "scenario_a.wav":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El benchmark actual usa C (humana declarada) y A (sintética Piper); revisa su procedencia local.",
        )

    human_scenario = scenario_service.get_scenario_by_id("scenario_c")
    synthetic_scenario = scenario_service.get_scenario_by_id("scenario_a")
    if not human_scenario or not synthetic_scenario or not human_scenario.audio_available or not synthetic_scenario.audio_available:
        unavailable = [
            sample.availability_note
            for sample in (human_scenario, synthetic_scenario)
            if sample and not sample.audio_available
        ]
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No están preparadas las muestras con procedencia declarada requeridas. " + " ".join(unavailable),
        )

    human_path = settings.AUDIO_SAMPLES_DIR / human_scenario.audio_file
    synth_path = settings.AUDIO_SAMPLES_DIR / synthetic_scenario.audio_file

    try:
        return experiment_service.run_comparative_experiment(
            human_sample_path=str(human_path),
            synth_sample_path=str(synth_path),
            human_source_description="C, humana según declaración y manifiesto local",
            synthetic_source_description="A, Piper sintética según manifiesto local",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error durante la ejecución del benchmark experimental: {str(e)}"
        )

@router.get("/history")
def get_experiment_history():
    """
    Recupera el historial de benchmarks ejecutados en el laboratorio.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, title, dataset_summary, metrics_json, created_at FROM experiment_records ORDER BY created_at DESC LIMIT 20")
    rows = cur.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "title": r["title"],
            "summary": r["dataset_summary"],
            "metrics": json.loads(r["metrics_json"]) if r["metrics_json"] else {},
            "created_at": r["created_at"]
        })
    return results
