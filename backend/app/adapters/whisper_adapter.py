import os
import time
from typing import Dict, Any, Tuple, List
from app.adapters.base import BaseWhisperAdapter
from app.core.config import settings

class FasterWhisperAdapter(BaseWhisperAdapter):
    def __init__(self):
        self.model = None
        self.model_size = settings.WHISPER_MODEL_SIZE
        self.device = "cpu"
        self.compute_type = "int8"
        self._is_loaded = False
        self._load_error = None

    def _load_model(self):
        if not self._is_loaded and self._load_error is None:
            try:
                from faster_whisper import WhisperModel
                self.model = WhisperModel(
                    self.model_size,
                    device=self.device,
                    compute_type=self.compute_type
                )
                self._is_loaded = True
            except Exception as e:
                self._load_error = str(e)
                self._is_loaded = False

    def is_available(self) -> Tuple[bool, str]:
        if self._is_loaded:
            return True, f"faster-whisper ({self.model_size}) cargado en {self.device}"
        if self._load_error:
            return False, f"faster-whisper error: {self._load_error}"
        return True, f"faster-whisper listo para carga diferida ({self.model_size}, {self.device})"

    def transcribe(self, audio_path: str, language: str = "es") -> Dict[str, Any]:
        start_time = time.time()
        self._load_model()
        
        if self._is_loaded and self.model is not None:
            try:
                segments, info = self.model.transcribe(
                    audio_path,
                    language=language,
                    beam_size=5,
                    vad_filter=True
                )
                
                segment_list = []
                full_text_parts = []
                for segment in segments:
                    segment_list.append({
                        "start": round(segment.start, 2),
                        "end": round(segment.end, 2),
                        "text": segment.text.strip()
                    })
                    full_text_parts.append(segment.text.strip())
                
                full_text = " ".join(full_text_parts)
                duration_ms = round((time.time() - start_time) * 1000, 2)
                
                return {
                    "transcript": full_text,
                    "language": info.language,
                    "language_probability": round(info.language_probability, 3),
                    "segments": segment_list,
                    "transcription_time_ms": duration_ms,
                    "engine": f"faster-whisper-{self.model_size}"
                }
            except Exception as e:
                # Si ocurre un fallo en tiempo de inferencia, informar
                return {
                    "transcript": f"[Error de transcripción automática: {str(e)}]",
                    "language": "es",
                    "language_probability": 0.0,
                    "segments": [],
                    "transcription_time_ms": round((time.time() - start_time) * 1000, 2),
                    "engine": "faster-whisper-error-fallback"
                }
        else:
            # Fallback seguro informativo
            return {
                "transcript": "[Transcripción diferida: modelo Whisper en proceso de inicialización]",
                "language": "es",
                "language_probability": 0.0,
                "segments": [],
                "transcription_time_ms": 0.0,
                "engine": "offline-fallback"
            }
