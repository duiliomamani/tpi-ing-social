from typing import List
from fastapi import APIRouter, HTTPException, status
from app.models.schemas import VishingScenario
from app.services.scenario_service import scenario_service

router = APIRouter(prefix="/simulation", tags=["Simulación de Vishing"])

@router.get("/scenarios", response_model=List[VishingScenario])
def get_vishing_scenarios():
    """
    Devuelve los 4 escenarios predefinidos para la demostración académica:
    - Escenario A: Suplantación de autoridad (Voz sintética + urgencia directiva)
    - Escenario B: Urgencia emocional (Voz sintética + retención aduana)
    - Escenario C: Comunicación legítima (Voz humana real + coordinación laboral)
    - Escenario D: Llamada sospechosa con voz humana (Voz humana real + ingeniería social clásica)
    """
    return scenario_service.get_all_scenarios()

@router.get("/scenarios/{scenario_id}", response_model=VishingScenario)
def get_scenario(scenario_id: str):
    scenario = scenario_service.get_scenario_by_id(scenario_id)
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Escenario '{scenario_id}' no encontrado."
        )
    return scenario

@router.post("/verify-channel/{scenario_id}")
def verify_out_of_band_channel(scenario_id: str):
    """
    Simulación académica de verificación fuera de banda:
    Simula marcar al número corporativo registrado o verificar mediante doble canal.
    """
    scenario = scenario_service.get_scenario_by_id(scenario_id)
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escenario no encontrado")

    if scenario.ground_truth_intent == "malicious":
        return {
            "verified": False,
            "channel": "Llamada inversa a conmutador oficial / Directorio Corporativo",
            "message": "ALERTA DE SEGURIDAD: El supuesto emisor no reconoce la llamada ni solicitó ningún procedimiento urgente. Se confirma intento de suplantación (Vishing).",
            "protocol_action": "Cortar la llamada sospechosa inmediatamente y reportar al CSIRT."
        }
    else:
        return {
            "verified": True,
            "channel": "Llamada inversa a interno corporativo oficial",
            "message": "IDENTIDAD CONFIRMADA: El emisor ratificó la comunicación y los términos de la solicitud.",
            "protocol_action": "Continuar con la interacción ordinaria."
        }
