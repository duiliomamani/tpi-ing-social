import os
from typing import List, Dict, Optional
from app.models.schemas import VishingScenario
from app.core.config import settings

SCENARIOS_DATA: List[Dict] = [
    {
        "id": "scenario_a",
        "code": "scenario_a",
        "title": "Escenario A — Suplantación de Autoridad",
        "category": "Vishing Corporativo",
        "description": "Una voz sintética autorizada representa a un directivo ficticio exigiendo la aprobación inmediata de un pago/procedimiento sin ticket formal.",
        "caller_name": "Martín Silva (Director Operaciones)",
        "caller_role": "Alta Dirección Corporativa",
        "caller_phone_display": "+54 11 4982-0199 (Corporativo)",
        "audio_file": "scenario_a.wav",
        "audio_url": "/api/audio/scenario_a.wav",
        "duration_seconds": 16.5,
        "ground_truth_voice": "synthetic",
        "ground_truth_intent": "malicious",
        "transcript": "Hola Carlos, soy Martín Silva de la Dirección de Operaciones. Estoy en una reunión crítica con el directorio y necesito que apruebes ya mismo la transferencia extraordinaria para la auditoría técnica. No tenemos tiempo de abrir un ticket formal, autorizalo ahora mismo y después regularizamos el procedimiento. No cortes la llamada.",
        "pedagogical_objective": "Demostrar cómo la combinación de clonación de voz de un superior jerárquico junto con presión de urgencia y evasión deliberada de canales formales busca anular el sentido crítico del empleado.",
        "default_verification_state": False
    },
    {
        "id": "scenario_b",
        "code": "scenario_b",
        "title": "Escenario B — Urgencia Emocional",
        "category": "Fraude Familiar / Personal",
        "description": "Una voz sintética autorizada finge ser un allegado en una situación de vulnerabilidad o detención administrativa solicitando dinero urgente.",
        "caller_name": "Lucas Morales (Allegado Ficticio)",
        "caller_role": "Familiar / Contacto de Confianza",
        "caller_phone_display": "+54 9 11 2341-8812 (Número Desconocido)",
        "audio_file": "scenario_b.wav",
        "audio_url": "/api/audio/scenario_b.wav",
        "duration_seconds": 15.2,
        "ground_truth_voice": "synthetic",
        "ground_truth_intent": "malicious",
        "transcript": "Hola, por favor ayudame, estoy retenido en la aduana del aeropuerto y no me dejan salir con el equipaje. Necesito con urgencia que me transfieras cincuenta mil pesos a la cuenta que te paso para abonar la tasa o me van a demorar y perderé el vuelo. Por favor te lo pido, no le digas nada a nadie todavía.",
        "pedagogical_objective": "Evidenciar el impacto de los detonantes emocionales (angustia, desesperación, petición de auxilio) para forzar transferencias económicas impulsivas sin validar la autenticidad.",
        "default_verification_state": False
    },
    {
        "id": "scenario_c",
        "code": "scenario_c",
        "title": "Escenario C — Comunicación Legítima",
        "category": "Interacción Cotidiana",
        "description": "Una persona real realiza una coordinación laboral habitual sin manipulación, sin peticiones sensibles ni urgencias ficticias.",
        "caller_name": "Sofía Benítez",
        "caller_role": "Coordinadora de Proyectos",
        "caller_phone_display": "+54 11 5521-3400 (Interno 204)",
        "audio_file": "scenario_c.wav",
        "audio_url": "/api/audio/scenario_c.wav",
        "duration_seconds": 12.0,
        "ground_truth_voice": "human",
        "ground_truth_intent": "legitimate",
        "transcript": "Hola Juan, te llamaba para coordinar la reunión de seguimiento del proyecto de redes para el jueves a las tres de la tarde. Revisá el calendario institucional cuando tengas un momento y confirmame si te queda bien ese horario. Que tengas un buen día.",
        "pedagogical_objective": "Proporcionar un control negativo de referencia biológica donde tanto la acústica como la semántica son benignas y acordes a los procedimientos de la organización.",
        "default_verification_state": True
    },
    {
        "id": "scenario_d",
        "code": "scenario_d",
        "title": "Escenario D — Llamada Sospechosa con Voz Humana",
        "category": "Ingeniería Social Clásica (No-AI)",
        "description": "Una grabación humana real contiene técnicas agresivas de manipulación y solicitud de credenciales sensibles, demostrando que el fraude telefónico no requiere IA para ser peligroso.",
        "caller_name": "Mesa de Ayuda Central (Falso Soporte)",
        "caller_role": "Falso Ingeniero de Soporte TI",
        "caller_phone_display": "+54 11 4000-8800 (Identificador Falsificado)",
        "audio_file": "scenario_d.wav",
        "audio_url": "/api/audio/scenario_d.wav",
        "duration_seconds": 17.8,
        "ground_truth_voice": "human",
        "ground_truth_intent": "malicious",
        "transcript": "Buenas tardes, nos comunicamos del área de ciberseguridad central de la empresa. Hemos detectado una intrusión inminente en tu equipo de trabajo y debemos restablecer tu cuenta corporativa. Por favor dictame inmediatamente el código de verificación OTP de seis dígitos que te acaba de llegar a tu teléfono móvil, de lo contrario procederemos a bloquear permanentemente tus accesos por política de seguridad.",
        "pedagogical_objective": "Demostrar que el vector crítico en seguridad sigue siendo la ingeniería social: un detector acústico clasificará esta voz como 'Humana', pero la acción correcta es rechazar y verificar por tratarse de un ataque de phishing telefónico.",
        "default_verification_state": False
    }
]

class ScenarioService:
    def get_all_scenarios(self) -> List[VishingScenario]:
        return [VishingScenario(**s) for s in SCENARIOS_DATA]

    def get_scenario_by_id(self, scenario_id: str) -> Optional[VishingScenario]:
        for s in SCENARIOS_DATA:
            if s["id"] == scenario_id or s["code"] == scenario_id:
                return VishingScenario(**s)
        return None

scenario_service = ScenarioService()
