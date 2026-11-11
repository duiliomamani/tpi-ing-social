import os
import uuid
from typing import Dict, Any, Optional
from app.adapters.chatterbox_adapter import ChatterboxAdapter
from app.core.config import settings
from app.core.database import save_audio_record
from app.models.schemas import VoiceGenerationResponse

class VoiceGenerationService:
    def __init__(self):
        self.tts_adapter = ChatterboxAdapter()

    def generate_voice(
        self,
        text: str,
        reference_audio_id: Optional[str],
        consent_granted: bool,
        speaker_alias: str = "Participante Autorizado",
        apply_perth_watermark: bool = True
    ) -> VoiceGenerationResponse:
        """
        Servicio de generación de voz con control ético de consentimiento y registro en BD.
        """
        if not consent_granted:
            raise PermissionError("Consentimiento expreso no otorgado. La síntesis ha sido denegada.")

        audio_id = f"synth_{uuid.uuid4().hex[:12]}"
        filename = f"{audio_id}.wav"
        output_path = str(settings.AUDIO_SAMPLES_DIR / filename)

        ref_path = None
        if reference_audio_id:
            candidate_ref = settings.UPLOADS_DIR / f"{reference_audio_id}.wav"
            if candidate_ref.exists():
                ref_path = str(candidate_ref)

        result = self.tts_adapter.synthesize(
            text=text,
            reference_audio_path=ref_path,
            output_path=output_path,
            consent_granted=consent_granted,
            apply_watermark=apply_perth_watermark
        )

        # Registrar en la base de datos
        save_audio_record(
            audio_id=audio_id,
            filename=filename,
            filepath=output_path,
            original_name=f"Clonación de {speaker_alias}",
            sample_rate=settings.TARGET_SAMPLE_RATE,
            duration=result["duration_seconds"],
            is_synthetic=True,
            watermark_detected=result["watermark_embedded"],
            creator_model=result["creator_model"],
            consent_granted=consent_granted
        )

        return VoiceGenerationResponse(
            audio_id=audio_id,
            filename=filename,
            audio_url=f"/api/audio/{filename}",
            duration_seconds=result["duration_seconds"],
            creator_model=result["creator_model"],
            is_synthetic=True,
            watermark_embedded=result["watermark_embedded"],
            academic_banner=result["academic_banner"],
            generation_time_ms=result["generation_time_ms"],
            message="Audio sintético generado y marcado exitosamente bajo autorización explícita.",
            ref_pitch_hz=result.get("ref_pitch_hz"),
            cloned_pitch_hz=result.get("cloned_pitch_hz"),
            pitch_correction_semitones=result.get("pitch_correction_semitones")
        )

voice_generation_service = VoiceGenerationService()
