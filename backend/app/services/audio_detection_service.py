import os
import soundfile as sf
import librosa
from typing import Dict, Any
from app.adapters.aasist_adapter import AASISTAdapter
from app.services.watermark_detection_service import watermark_detection_service
from app.services.audio_processing import extract_waveform_peaks, compute_spectrogram_summary
from app.core.config import settings
from app.models.schemas import (
    AudioAnalysisResponse,
    AASISTDetectionResult,
    WatermarkDetectionResult,
    AudioVisualizationData
)

class AudioDetectionService:
    def __init__(self):
        self.aasist_adapter = AASISTAdapter()

    def analyze_audio_file(self, audio_path: str, audio_id: str) -> AudioAnalysisResponse:
        """
        Pipeline forense acústico integral:
        1. Validación técnica
        2. Conservación del original y análisis acústico con AASIST
        3. Detección de marca de agua de procedencia PerTh
        4. Extracción de envolvente temporal (peaks) y espectrograma STFT
        """
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Archivo de audio no encontrado: {audio_path}")

        # Metadatos del audio
        info = sf.info(audio_path)
        duration = float(info.duration)
        sample_rate = int(info.samplerate)
        channels = int(info.channels)

        # 1. Ejecutar AASIST
        aasist_raw = self.aasist_adapter.detect_synthetic(audio_path)
        aasist_result = AASISTDetectionResult(
            model_name=aasist_raw["model_name"],
            model_version=aasist_raw["model_version"],
            raw_score=aasist_raw["raw_score"],
            is_calibrated=aasist_raw["is_calibrated"],
            verdict=aasist_raw["verdict"],
            decision_threshold=aasist_raw["decision_threshold"],
            technical_interpretation=aasist_raw["technical_interpretation"],
            limitations=aasist_raw["limitations"],
            inference_time_ms=aasist_raw["inference_time_ms"]
        )

        # 2. Ejecutar detección de marca de agua PerTh
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

        # Resumen consolidado del frente físico
        summary_parts = [
            f"Veredicto Acústico: {aasist_result.verdict} (Score técnico: {aasist_result.raw_score:+.3f}).",
            f"Procedencia PerTh: {'Marca presente' if watermark_result.detected else 'Sin marca identificable'}."
        ]
        overall_summary = " ".join(summary_parts)

        return AudioAnalysisResponse(
            audio_id=audio_id,
            filename=os.path.basename(audio_path),
            acoustic_detection=aasist_result,
            watermark_detection=watermark_result,
            visualization=visualization,
            overall_acoustic_summary=overall_summary
        )

audio_detection_service = AudioDetectionService()
