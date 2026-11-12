from typing import Dict, Any
from app.adapters.whisper_adapter import FasterWhisperAdapter

class TranscriptionService:
    def __init__(self):
        self.adapter = FasterWhisperAdapter()

    def transcribe_audio(
        self,
        audio_path: str,
        language: str = "es",
        beam_size: int = 5,
    ) -> Dict[str, Any]:
        return self.adapter.transcribe(
            audio_path,
            language=language,
            beam_size=beam_size,
        )

transcription_service = TranscriptionService()
