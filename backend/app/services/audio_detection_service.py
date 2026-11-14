import os
import soundfile as sf
import librosa
from typing import Dict, Any
from app.adapters.aasist_adapter import VoiceShieldAcousticAdapter
from app.services.watermark_detection_service import watermark_detection_service
from app.services.audio_processing import extract_waveform_peaks, compute_spectrogram_summary
from app.core.config import settings
from app.models.schemas import (
    AudioAnalysisResponse,
    AcousticDetectionResult,
    WatermarkDetectionResult,
    AudioVisualizationData
)

class AudioDetectionService:
    def __init__(self):
        self.acoustic_adapter = VoiceShieldAcousticAdapter()

    def analyze_audio_file(self, audio_path: str, audio_id: str) -> AudioAnalysisResponse:
        """
        Análisis técnico y acústico exploratorio:
        1. Validación técnica
        2. Clasificación acústica experimental del laboratorio
        3. Consulta del método de marca de procedencia disponible
        4. Extracción de envolvente temporal (peaks) y espectrograma STFT
        """
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Archivo de audio no encontrado: {audio_path}")

        # Metadatos del audio
        info = sf.info(audio_path)
        duration = float(info.duration)
        sample_rate = int(info.samplerate)
        channels = int(info.channels)

        # 1. Ejecutar el detector acústico experimental
        acoustic_raw = self.acoustic_adapter.detect_synthetic(audio_path)
        acoustic_result = AcousticDetectionResult(
            model_name=acoustic_raw["model_name"],
            model_version=acoustic_raw["model_version"],
            engine_used=acoustic_raw["engine_used"],
            raw_score=acoustic_raw["raw_score"],
            is_calibrated=acoustic_raw["is_calibrated"],
            verdict=acoustic_raw["verdict"],
            decision_threshold=acoustic_raw["decision_threshold"],
            technical_interpretation=acoustic_raw["technical_interpretation"],
            limitations=acoustic_raw["limitations"],
            inference_time_ms=acoustic_raw["inference_time_ms"]
        )

        # 2. Consultar la marca de procedencia configurada
        watermark_result = watermark_detection_service.analyze_watermark(audio_path)

        # 3. Generar forma de onda y espectrograma
        waveform_peaks = extract_waveform_peaks(audio_path, num_peaks=120)
        spectrogram_summary = compute_spectrogram_summary(audio_path)

        visualization = AudioVisualizationData(
            waveform_peaks=waveform_peaks,
            sample_rate=sample_rate,
            duration=round(duration, 2),
            channels=channels,
            spectrogram_summary=spectrogram_summary
        )

        # Resumen consolidado de las señales acústicas consultadas
        summary_parts = [
            f"Veredicto del detector experimental: {acoustic_result.verdict} (score: {acoustic_result.raw_score:+.3f}).",
            f"Marca consultada ({watermark_result.method_name}): {watermark_result.status}."
        ]
        overall_summary = " ".join(summary_parts)

        return AudioAnalysisResponse(
            audio_id=audio_id,
            filename=os.path.basename(audio_path),
            acoustic_detection=acoustic_result,
            watermark_detection=watermark_result,
            visualization=visualization,
            overall_acoustic_summary=overall_summary
        )

audio_detection_service = AudioDetectionService()
