import json
import hashlib
from pathlib import Path
from typing import List, Dict, Optional
import soundfile as sf
from app.models.schemas import LabAudioSample
from app.core.config import settings

SCENARIOS_DATA: List[Dict] = [
    {
        "id": "scenario_a",
        "code": "scenario_a",
        "title": "Muestra A — Suplantación de Autoridad",
        "category": "Vishing Corporativo",
        "description": "Audio de voz sintética que representa a un directivo ficticio y exige aprobar un pago sin ticket formal.",
        "caller_name": "Martín Silva (Director Operaciones)",
        "caller_role": "Alta Dirección Corporativa",
        "caller_phone_display": "+54 11 4982-0199 (Corporativo)",
        "audio_file": "scenario_a.wav",
        "audio_url": "/api/audio/scenario_a.wav",
        "duration_seconds": 16.5,
        "ground_truth_voice": "synthetic",
        "ground_truth_intent": "malicious",
        "ground_truth_basis": "Etiqueta de voz sintética declarada por el generador local; intención maliciosa definida por el guion ficticio.",
        "transcript": "Hola Carlos, soy Martín Silva de la Dirección de Operaciones. Estoy en una reunión crítica con el directorio y necesito que apruebes ya mismo la transferencia extraordinaria para la auditoría técnica. No tenemos tiempo de abrir un ticket formal, autorizalo ahora mismo y después regularizamos el procedimiento. No cortes la llamada.",
        "pedagogical_objective": "Demostrar cómo la combinación de clonación de voz de un superior jerárquico junto con presión de urgencia y evasión deliberada de canales formales busca anular el sentido crítico del empleado.",
        "default_verification_state": False
    },
    {
        "id": "scenario_b",
        "code": "scenario_b",
        "title": "Muestra B — Urgencia Emocional",
        "category": "Fraude Familiar / Personal",
        "description": "Audio de voz sintética que finge ser un allegado y solicita dinero con urgencia.",
        "caller_name": "Lucas Morales (Allegado Ficticio)",
        "caller_role": "Familiar / Contacto de Confianza",
        "caller_phone_display": "+54 9 11 2341-8812 (Número Desconocido)",
        "audio_file": "scenario_b.wav",
        "audio_url": "/api/audio/scenario_b.wav",
        "duration_seconds": 15.2,
        "ground_truth_voice": "synthetic",
        "ground_truth_intent": "malicious",
        "ground_truth_basis": "Etiqueta de voz sintética declarada por el generador local; intención maliciosa definida por el guion ficticio.",
        "transcript": "Hola, por favor ayudame, estoy retenido en la aduana del aeropuerto y no me dejan salir con el equipaje. Necesito con urgencia que me transfieras cincuenta mil pesos a la cuenta que te paso para abonar la tasa o me van a demorar y perderé el vuelo. Por favor te lo pido, no le digas nada a nadie todavía.",
        "pedagogical_objective": "Evidenciar el impacto de los detonantes emocionales (angustia, desesperación, petición de auxilio) para forzar transferencias económicas impulsivas sin validar la autenticidad.",
        "default_verification_state": False
    },
    {
        "id": "scenario_c",
        "code": "scenario_c",
        "title": "Muestra C — Comunicación Legítima",
        "category": "Interacción Cotidiana",
        "description": "Control legítimo previsto: coordinación laboral habitual, sin manipulación ni petición sensible. Requiere una grabación humana consentida.",
        "caller_name": "Sofía Benítez",
        "caller_role": "Coordinadora de Proyectos",
        "caller_phone_display": "+54 11 5521-3400 (Interno 204)",
        "audio_file": "scenario_c.wav",
        "audio_url": "/api/audio/scenario_c.wav",
        "duration_seconds": 12.0,
        "ground_truth_voice": "human",
        "ground_truth_intent": "legitimate",
        "ground_truth_basis": "Debe declararse como grabación humana consentida aportada por el operador; el sistema no comprueba automáticamente el origen.",
        "transcript": "Hola Juan, te llamaba para coordinar la reunión de seguimiento del proyecto de redes para el jueves a las tres de la tarde. Revisá el calendario institucional cuando tengas un momento y confirmame si te queda bien ese horario. Que tengas un buen día.",
        "pedagogical_objective": "Proporcionar un control benigno que solo se etiqueta como humano si se aporta y registra una grabación consentida.",
        "default_verification_state": False
    },
    {
        "id": "scenario_d",
        "code": "scenario_d",
        "title": "Muestra D — Solicitud Sospechosa con Voz Humana",
        "category": "Ingeniería Social Clásica (No-AI)",
        "description": "Control de vishing con guion ficticio de solicitud de OTP. Requiere una grabación humana consentida; la clasificación del detector no se presupone.",
        "caller_name": "Mesa de Ayuda Central (Falso Soporte)",
        "caller_role": "Falso Ingeniero de Soporte TI",
        "caller_phone_display": "+54 11 4000-8800 (Identificador Falsificado)",
        "audio_file": "scenario_d.wav",
        "audio_url": "/api/audio/scenario_d.wav",
        "duration_seconds": 17.8,
        "ground_truth_voice": "human",
        "ground_truth_intent": "malicious",
        "ground_truth_basis": "Debe declararse como grabación humana consentida aportada por el operador; el sistema no comprueba automáticamente el origen.",
        "transcript": "Buenas tardes, nos comunicamos del área de ciberseguridad central de la empresa. Hemos detectado una intrusión inminente en tu equipo de trabajo y debemos restablecer tu cuenta corporativa. Por favor dictame inmediatamente el código de verificación OTP de seis dígitos que te acaba de llegar a tu teléfono móvil, de lo contrario procederemos a bloquear permanentemente tus accesos por política de seguridad.",
        "pedagogical_objective": "Estudiar cómo una solicitud de OTP puede aparecer en un guion de vishing humano; la salida del detector puede variar y no define la legitimidad del pedido.",
        "default_verification_state": False
    }
]

class ScenarioService:
    @staticmethod
    def _sha256_file(path: Path) -> Optional[str]:
        try:
            digest = hashlib.sha256()
            with path.open("rb") as audio_file:
                for chunk in iter(lambda: audio_file.read(1024 * 1024), b""):
                    digest.update(chunk)
            return digest.hexdigest()
        except OSError:
            return None

    def _read_provenance(self) -> Dict[str, Dict]:
        manifest_path = settings.AUDIO_SAMPLES_DIR / "scenario_provenance.json"
        try:
            payload = json.loads(manifest_path.read_text(encoding="utf-8"))
            scenarios = payload.get("scenarios", {})
            return scenarios if isinstance(scenarios, dict) else {}
        except (OSError, json.JSONDecodeError, TypeError):
            return {}

    @staticmethod
    def _to_lab_sample(scenario: Dict, provenance: Dict[str, Dict]) -> LabAudioSample:
        audio_path = settings.AUDIO_SAMPLES_DIR / scenario["audio_file"]
        entry = provenance.get(scenario["code"], {})
        expected_source_kind = (
            "consented_human_recording"
            if scenario["ground_truth_voice"] == "human"
            else "piper_synthetic_voice"
        )
        provenance_matches = (
            entry.get("audio_file") == scenario["audio_file"]
            and entry.get("audio_sha256") == ScenarioService._sha256_file(audio_path)
            and entry.get("audio_sha256") is not None
            and entry.get("voice_origin") == scenario["ground_truth_voice"]
            and entry.get("intent") == scenario["ground_truth_intent"]
            and entry.get("source_kind") == expected_source_kind
            and (
                scenario["ground_truth_voice"] != "human"
                or (
                    entry.get("consent_declared") is True
                    and entry.get("transcript_reviewed_by_operator") is True
                )
            )
        )
        audio_available = audio_path.is_file() and provenance_matches
        availability_note = (
            "Audio disponible y con origen declarado en el manifiesto local."
            if audio_available
            else "Audio ausente o sin registro de procedencia válido; no se ofrece como muestra etiquetada."
        )
        try:
            duration_seconds = float(sf.info(str(audio_path)).duration) if audio_available else 0.0
        except (OSError, RuntimeError):
            audio_available = False
            availability_note = "El WAV no se pudo leer como audio válido."
            duration_seconds = 0.0
        return LabAudioSample(
            **scenario,
            duration_seconds=round(duration_seconds, 2),
            audio_available=audio_available,
            availability_note=availability_note,
        )

    def get_all_scenarios(self) -> List[LabAudioSample]:
        provenance = self._read_provenance()
        return [self._to_lab_sample(s, provenance) for s in SCENARIOS_DATA]

    def get_scenario_by_id(self, scenario_id: str) -> Optional[LabAudioSample]:
        provenance = self._read_provenance()
        for s in SCENARIOS_DATA:
            if s["id"] == scenario_id or s["code"] == scenario_id:
                return self._to_lab_sample(s, provenance)
        return None

    def purge_operator_recorded_scenarios(self) -> int:
        """Delete only C/D audio explicitly registered as consented human recordings."""
        manifest_path = settings.AUDIO_SAMPLES_DIR / "scenario_provenance.json"
        provenance = self._read_provenance()
        removed = 0
        retained = dict(provenance)
        for code in ("scenario_c", "scenario_d"):
            entry = provenance.get(code, {})
            if entry.get("source_kind") != "consented_human_recording":
                continue
            filename = entry.get("audio_file")
            scenario = next((item for item in SCENARIOS_DATA if item["code"] == code), None)
            if not scenario or filename != scenario["audio_file"]:
                continue
            audio_path = settings.AUDIO_SAMPLES_DIR / filename
            if audio_path.is_file():
                audio_path.unlink()
                removed += 1
            retained.pop(code, None)

        payload = {
            "schema_version": 1,
            "note": "El origen humano y el consentimiento son declaraciones del operador; el laboratorio no los verifica automáticamente.",
            "scenarios": retained,
        }
        temporary_manifest = manifest_path.with_suffix(".json.tmp")
        temporary_manifest.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary_manifest.replace(manifest_path)
        return removed

scenario_service = ScenarioService()
