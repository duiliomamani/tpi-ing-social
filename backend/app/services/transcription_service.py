from typing import Dict, Any
from app.adapters.whisper_adapter import FasterWhisperAdapter

class TranscriptionService:
    def __init__(self):
        self.adapter = FasterWhisperAdapter()

    def transcribe_audio(self, audio_path: str, language: str = "es") -> Dict[str, Any]:
        return self.adapter.transcribe(audio_path, language=language)

transcription_service = TranscriptionService()
