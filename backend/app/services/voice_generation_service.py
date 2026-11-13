import os
import uuid
from typing import Callable, Dict, Any, Optional
from app.adapters.f5_tts_adapter import F5TTSAdapter
from app.core.config import ensure_data_directories, settings
from app.core.database import save_audio_record
from app.models.schemas import VoiceGenerationResponse
from app.services.watermark_detection_service import watermark_detection_service

class VoiceGenerationService:
    def __init__(self):
        self.tts_adapter = F5TTSAdapter(watermarker=watermark_detection_service.adapter)

    def generate_voice(
        self,
        text: str,
        reference_audio_id: str,
        reference_transcript: str,
        consent_granted: bool,
        speaker_alias: str = "Participante Autorizado",
        apply_perth_watermark: bool = True,
        cfg_strength: float = 2.0,
        nfe_step: int = 32,
        speed: float = 1.0,
        progress_callback: Optional[Callable[[str], None]] = None,
    ) -> VoiceGenerationResponse:
        """
        Servicio de generación de voz con control ético de consentimiento y registro en BD.
        """
        if not consent_granted:
            raise PermissionError("Consentimiento expreso no otorgado. La síntesis ha sido denegada.")

        audio_id = f"synth_{uuid.uuid4().hex[:12]}"
        filename = f"{audio_id}.wav"
        ensure_data_directories()
        output_path = str(settings.AUDIO_SAMPLES_DIR / filename)

        ref_path = None
        if reference_audio_id:
            candidate_ref = settings.UPLOADS_DIR / f"{reference_audio_id}.wav"
            if candidate_ref.exists():
                ref_path = str(candidate_ref)
        if ref_path is None:
            raise ValueError("No se encontró el audio de referencia cargado.")

        result = self.tts_adapter.synthesize(
            text=text,
            reference_audio_path=ref_path,
            output_path=output_path,
            consent_granted=consent_granted,
            apply_watermark=apply_perth_watermark,
            reference_transcript=reference_transcript,
            cfg_strength=cfg_strength,
            nfe_step=nfe_step,
            speed=speed,
            progress_callback=progress_callback,
        )

        # Registrar en la base de datos
        save_audio_record(
            audio_id=audio_id,
            filename=filename,
            filepath=output_path,
            original_name=f"Clonación de {speaker_alias}",
            sample_rate=result.get("sample_rate", settings.TARGET_SAMPLE_RATE),
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
            sample_rate=result.get("sample_rate", settings.TARGET_SAMPLE_RATE),
            creator_model=result["creator_model"],
            is_synthetic=True,
            watermark_embedded=result["watermark_embedded"],
            academic_banner=result["academic_banner"],
            generation_time_ms=result["generation_time_ms"],
            message=(
                "Audio sintético generado bajo autorización explícita"
                + (" y con marca de procedencia del laboratorio." if result["watermark_embedded"] else ".")
            ),
            ref_pitch_hz=result.get("ref_pitch_hz"),
            cloned_pitch_hz=result.get("cloned_pitch_hz"),
            pitch_correction_semitones=result.get("pitch_correction_semitones")
        )

voice_generation_service = VoiceGenerationService()
