from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Tuple
import numpy as np

class BaseTTSAdapter(ABC):
    @abstractmethod
    def is_available(self) -> Tuple[bool, str]:
        """Check if TTS model is installed and functional."""
        pass

    @abstractmethod
    def synthesize(
        self,
        text: str,
        reference_audio_path: Optional[str],
        output_path: str,
        consent_granted: bool,
        apply_watermark: bool = True
    ) -> Dict[str, Any]:
        """Synthesize speech with explicit consent verification."""
        pass

class BaseWhisperAdapter(ABC):
    @abstractmethod
    def is_available(self) -> Tuple[bool, str]:
        """Check if Whisper model is available."""
        pass

    @abstractmethod
    def transcribe(self, audio_path: str, language: str = "es") -> Dict[str, Any]:
        """Transcribe speech to text with timestamps."""
        pass

class BaseAudioDetectorAdapter(ABC):
    @abstractmethod
    def is_available(self) -> Tuple[bool, str]:
        """Check if AASIST or acoustic detector model is available."""
        pass

    @abstractmethod
    def detect_synthetic(self, audio_path: str) -> Dict[str, Any]:
        """Classify audio as synthetic or human, returning raw uncalibrated scores."""
        pass

class BaseWatermarkAdapter(ABC):
    @abstractmethod
    def is_available(self) -> Tuple[bool, str]:
        """Check if PerTh watermark engine is available."""
        pass

    @abstractmethod
    def embed_watermark(self, input_audio_path: str, output_audio_path: str, payload: str = "VOICESHIELD_SYNTHETIC_AUDIO") -> bool:
        """Embed a perceptual threshold watermark."""
        pass

    @abstractmethod
    def detect_watermark(self, audio_path: str) -> Dict[str, Any]:
        """Detect perceptual watermark signature."""
        pass

class BaseLLMAdapter(ABC):
    @abstractmethod
    def is_available(self) -> Tuple[bool, str]:
        """Check if Ollama & Gemma 3 are available."""
        pass

    @abstractmethod
    def analyze_social_engineering(self, transcript: str) -> Dict[str, Any]:
        """Analyze text for social engineering manipulation factors with prompt defense."""
        pass
