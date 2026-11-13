from copy import deepcopy
from datetime import datetime, timezone
import threading
import time
import uuid
from typing import Any, Dict

from app.models.schemas import VoiceGenerationJobResponse, VoiceGenerationRequest
from app.services.voice_generation_service import voice_generation_service


class VoiceGenerationJobService:
    """In-process job tracking for long-running local F5-TTS synthesis."""

    JOB_TTL_SECONDS = 2 * 60 * 60

    def __init__(self) -> None:
        self._jobs: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.RLock()

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()

    def _prune_expired_locked(self) -> None:
        cutoff = time.monotonic() - self.JOB_TTL_SECONDS
        expired = [
            job_id
            for job_id, job in self._jobs.items()
            if job["finished_monotonic"] is not None and job["finished_monotonic"] < cutoff
        ]
        for job_id in expired:
            self._jobs.pop(job_id, None)

    def start(self, request: VoiceGenerationRequest) -> VoiceGenerationJobResponse:
        now = self._now()
        job_id = f"genjob_{uuid.uuid4().hex[:16]}"
        with self._lock:
            self._prune_expired_locked()
            self._jobs[job_id] = {
                "job_id": job_id,
                "status": "queued",
                "phase_message": "En cola para el motor local F5-TTS…",
                "created_at": now,
                "updated_at": now,
                "result": None,
                "error": None,
                "finished_monotonic": None,
            }

        thread = threading.Thread(
            target=self._run,
            args=(job_id, request.model_copy(deep=True)),
            name=f"voice-generation-{job_id}",
            daemon=True,
        )
        thread.start()
        return self.get(job_id)

    def get(self, job_id: str) -> VoiceGenerationJobResponse:
        with self._lock:
            self._prune_expired_locked()
            job = self._jobs.get(job_id)
            if job is None:
                raise KeyError(job_id)
            public_job = {
                key: value
                for key, value in job.items()
                if key != "finished_monotonic"
            }
            return VoiceGenerationJobResponse(**deepcopy(public_job))

    def _set_progress(self, job_id: str, message: str) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return
            job["status"] = "running"
            job["phase_message"] = message
            job["updated_at"] = self._now()

    def _run(self, job_id: str, request: VoiceGenerationRequest) -> None:
        self._set_progress(job_id, "Iniciando el motor F5-TTS…")
        try:
            result = voice_generation_service.generate_voice(
                text=request.text,
                reference_audio_id=request.reference_audio_id,
                reference_transcript=request.reference_transcript,
                consent_granted=request.consent_granted,
                speaker_alias=request.speaker_alias,
                apply_perth_watermark=request.apply_perth_watermark,
                cfg_strength=request.cfg_strength,
                nfe_step=request.nfe_step,
                speed=request.speed,
                progress_callback=lambda message: self._set_progress(job_id, message),
            )
            with self._lock:
                job = self._jobs.get(job_id)
                if job is None:
                    return
                job["status"] = "completed"
                job["phase_message"] = "Audio generado correctamente."
                job["result"] = result
                job["updated_at"] = self._now()
                job["finished_monotonic"] = time.monotonic()
        except Exception as exc:
            with self._lock:
                job = self._jobs.get(job_id)
                if job is None:
                    return
                job["status"] = "failed"
                job["phase_message"] = "La generación no pudo completarse."
                job["error"] = str(exc) or "Error desconocido durante la síntesis."
                job["updated_at"] = self._now()
                job["finished_monotonic"] = time.monotonic()


voice_generation_job_service = VoiceGenerationJobService()
