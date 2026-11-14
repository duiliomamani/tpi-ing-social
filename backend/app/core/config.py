import os
from pathlib import Path
from pydantic import BaseModel

class Settings(BaseModel):
    APP_NAME: str = "VoiceShield Lab — Voice Cloning & Audio Analysis"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    AUDIO_SAMPLES_DIR: Path = DATA_DIR / "audio_samples"
    UPLOADS_DIR: Path = DATA_DIR / "uploads"
    EXPERIMENTS_DIR: Path = DATA_DIR / "experiments"
    WEIGHTS_DIR: Path = BASE_DIR / "weights"
    DB_PATH: Path = DATA_DIR / "voiceshield.db"
    
    # Model Configurations
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "gemma3:4b")
    
    WHISPER_MODEL_SIZE: str = os.getenv("WHISPER_MODEL_SIZE", "base")
    WHISPER_LANGUAGE: str = "es"
    
    ACOUSTIC_CHECKPOINT_PATH: Path = WEIGHTS_DIR / "voiceshield-acoustic-prototype.pth"
    
    # Audio constants
    TARGET_SAMPLE_RATE: int = 16000
    MAX_UPLOAD_SIZE_BYTES: int = 100 * 1024 * 1024  # 100 MB
    MAX_AUDIO_DURATION_SECONDS: float = 300.0  # 5 minutes for lab demos
    MAX_VOICE_SOURCE_DURATION_SECONDS: float = 600.0  # Allow long source recordings for local transcription
    MAX_VOICE_REFERENCE_DURATION_SECONDS: float = 12.0  # F5-TTS reference limit
    MAX_F5_TOTAL_DURATION_SECONDS: float = 30.0  # Keep one local demo inference bounded
    
    # Academic Label
    SYNTHETIC_AUDIO_BANNER: str = "AUDIO SINTÉTICO — DEMOSTRACIÓN ACADÉMICA"

settings = Settings()

def ensure_data_directories() -> None:
    """Recreate the writable lab folders if they were removed during cleanup."""
    for directory in (
        settings.DATA_DIR,
        settings.AUDIO_SAMPLES_DIR,
        settings.UPLOADS_DIR,
        settings.EXPERIMENTS_DIR,
        settings.WEIGHTS_DIR,
    ):
        directory.mkdir(parents=True, exist_ok=True)


ensure_data_directories()
