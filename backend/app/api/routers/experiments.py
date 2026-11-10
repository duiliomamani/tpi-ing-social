import os
import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.core.config import settings
from app.models.schemas import ExperimentResult
from app.services.experiment_service import experiment_service
from app.core.database import get_db_connection

router = APIRouter(prefix="/experiments", tags=["Laboratorio Comparativo y Robustez"])

class RunBenchmarkRequest(BaseModel):
    human_sample: str = "scenario_c.wav"
    synthetic_sample: str = "scenario_a.wav"

@router.post("/run-benchmark", response_model=ExperimentResult)
def run_reproducible_benchmark(request: RunBenchmarkRequest):
    """
    Ejecuta el protocolo comparativo de robustez con FFmpeg sobre 8 muestras normalizadas:
    - Humano Limpio vs Sintético Limpio
    - Humano Comprimido MP3 (32k) vs Sintético Comprimido MP3 (32k)
    - Humano con Ruido Gaussiano vs Sintético con Ruido
    - Humano con Filtro Telefónico (300Hz-3400Hz) vs Sintético Telefónico
    Calcula: Matriz de confusión, TP, TN, FP, FN, Precision, Recall, F1, FPR, FNR, EER y curva de error.
    """
    human_path = settings.AUDIO_SAMPLES_DIR / request.human_sample
    synth_path = settings.AUDIO_SAMPLES_DIR / request.synthetic_sample

    if not human_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Muestra humana '{request.human_sample}' no encontrada en el repositorio."
        )
    if not synth_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Muestra sintética '{request.synthetic_sample}' no encontrada en el repositorio."
        )

    try:
        return experiment_service.run_comparative_experiment(
            human_sample_path=str(human_path),
            synth_sample_path=str(synth_path)
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
