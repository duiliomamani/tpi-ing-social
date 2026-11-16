import asyncio
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import soundfile as sf
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.config import settings
from app.services.call_simulation_service import (
    ACTION_TEXT,
    call_simulation_service,
    detect_defensive_action,
    sanitize_for_transcript,
)
from app.services.social_engineering_service import social_engineering_service


router = APIRouter(prefix="/call-simulation", tags=["Simulación local de llamadas"])
MAX_TURNS = 5


@router.get("/status")
def get_call_simulation_status():
    return call_simulation_service.status()


def _reference_details(reference_audio_id: str, transcript: str, consent: bool) -> tuple[Path, str]:
    if not consent:
        raise ValueError("Declarà que tenés autorización para usar esta muestra de voz.")
    if not re.fullmatch(r"ref_[a-zA-Z0-9]{10,32}", reference_audio_id):
        raise ValueError("La referencia de voz no tiene un identificador válido.")
    clean_transcript = " ".join(transcript.split())[:800]
    if not clean_transcript:
        raise ValueError("Prepará y revisá la transcripción de la muestra de voz.")
    reference_path = (settings.UPLOADS_DIR / f"{reference_audio_id}.wav").resolve()
    if settings.UPLOADS_DIR.resolve() not in reference_path.parents or not reference_path.is_file():
        raise ValueError("No se encontró el recorte local de voz. Volvé a preparar la muestra.")
    try:
        duration = float(sf.info(str(reference_path)).duration)
    except Exception as exc:
        raise ValueError("No se pudieron leer los metadatos del recorte de voz.") from exc
    if duration < 3.0 or duration > settings.MAX_VOICE_REFERENCE_DURATION_SECONDS:
        raise ValueError("Para esta simulación, el recorte de voz debe durar entre 3 y 12 segundos.")
    return reference_path, clean_transcript


async def _send_audio_line(
    websocket: WebSocket,
    text: str,
    reference_path: Path,
    reference_transcript: str,
    final: bool = False,
) -> None:
    await websocket.send_json({"type": "caller_text", "text": text, "final": final})
    await call_simulation_service.stream_tts(
        websocket,
        text,
        reference_path,
        reference_transcript,
    )


async def _finish_analysis(caller_lines: List[str]) -> Dict[str, Any]:
    transcript = " ".join(caller_lines)
    try:
        result = await asyncio.to_thread(social_engineering_service.analyze, transcript, "call_simulation")
        return result.model_dump()
    except Exception as exc:
        return {"summary": f"La revisión automática no pudo completarse: {exc}", "factors": []}


@router.websocket("/live")
async def run_live_call_simulation(websocket: WebSocket):
    await websocket.accept()
    try:
        start = await websocket.receive_json()
        if start.get("type") != "start":
            await websocket.send_json({"type": "error", "message": "Iniciá la conexión con la configuración de la simulación."})
            await websocket.close(code=1008)
            return
        try:
            reference_path, reference_transcript = _reference_details(
                str(start.get("reference_audio_id", "")),
                str(start.get("reference_transcript", "")),
                bool(start.get("consent_granted", False)),
            )
        except ValueError as exc:
            await websocket.send_json({"type": "error", "message": str(exc)})
            await websocket.close(code=1008)
            return

        await websocket.send_json({
            "type": "session_started",
            "mode": "local",
            "scenario": "soporte_it_ficticio",
            "llm_model": settings.OLLAMA_MODEL,
            "tts_model": settings.QWEN_TTS_MODEL,
        })

        history: List[Dict[str, str]] = []
        caller_lines: List[str] = []
        participant_lines: List[str] = []
        first_line = await call_simulation_service.generate_caller_line(history, opening=True)
        history.append({"role": "assistant", "content": first_line})
        caller_lines.append(first_line)
        await _send_audio_line(websocket, first_line, reference_path, reference_transcript)

        turn_count = 0
        while True:
            message = await websocket.receive_json()
            message_type = str(message.get("type", ""))
            if message_type == "finish":
                participant_text = "El participante finalizó la llamada."
                action: Optional[str] = "hangup"
            elif message_type == "user_audio":
                try:
                    participant_text = await call_simulation_service.transcribe_participant_audio(message)
                except ValueError as exc:
                    await websocket.send_json({"type": "input_error", "message": str(exc)})
                    continue
                action = detect_defensive_action(participant_text)
            elif message_type in {"user_text", "action"}:
                action = str(message.get("action", "")) if message_type == "action" else None
                if action not in ACTION_TEXT:
                    action = None
                participant_text = ACTION_TEXT[action] if action else str(message.get("text", ""))
            else:
                await websocket.send_json({"type": "input_error", "message": "Tipo de respuesta no reconocido."})
                continue

            participant_text = sanitize_for_transcript(participant_text)
            if not participant_text:
                await websocket.send_json({"type": "input_error", "message": "Escribí una respuesta o usá una opción de seguridad."})
                continue

            turn_count += 1
            participant_lines.append(participant_text)
            await websocket.send_json({"type": "participant_text", "text": participant_text})
            if message_type != "finish":
                history.append({"role": "user", "content": f"<RESPUESTA_PARTICIPANTE>{participant_text}</RESPUESTA_PARTICIPANTE>"})

            if action is None:
                action = detect_defensive_action(participant_text)
            if action or turn_count >= MAX_TURNS:
                if action:
                    closing_line = "Entendido, finalizamos la simulación. Verificar por un canal oficial y no compartir códigos es la respuesta segura."
                    outcome = "respuesta_defensiva"
                    outcome_message = "Cortaste la presión y elegiste una respuesta defensiva."
                else:
                    closing_line = "Terminó el tiempo de práctica. Revisemos las señales de esta llamada y el protocolo recomendado."
                    outcome = "practica_finalizada"
                    outcome_message = "La llamada terminó sin registrar una verificación defensiva explícita."
                caller_lines.append(closing_line)
                await _send_audio_line(websocket, closing_line, reference_path, reference_transcript, final=True)
                # Exclude the facilitator's closing sentence from the adversarial-script analysis.
                analysis = await _finish_analysis(caller_lines[:-1])
                await websocket.send_json({
                    "type": "session_ended",
                    "outcome": outcome,
                    "outcome_message": outcome_message,
                    "defensive_action": action,
                    "caller_transcript": " ".join(caller_lines[:-1]),
                    "participant_transcript": " ".join(participant_lines),
                    "risk_analysis": analysis,
                    "turns": turn_count,
                    "models": {"llm": settings.OLLAMA_MODEL, "tts": settings.QWEN_TTS_MODEL},
                })
                return

            next_line = await call_simulation_service.generate_caller_line(history)
            history.append({"role": "assistant", "content": next_line})
            caller_lines.append(next_line)
            await _send_audio_line(websocket, next_line, reference_path, reference_transcript)
    except WebSocketDisconnect:
        return
    except Exception as exc:
        try:
            await websocket.send_json({"type": "error", "message": f"La simulación local se interrumpió: {exc}"})
            await websocket.close(code=1011)
        except Exception:
            return
