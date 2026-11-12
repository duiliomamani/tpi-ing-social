"""Compatibility import for code written before the lab moved to F5-TTS."""

from app.adapters.f5_tts_adapter import F5TTSAdapter

ChatterboxAdapter = F5TTSAdapter
