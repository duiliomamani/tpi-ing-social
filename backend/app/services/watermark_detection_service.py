from typing import Dict, Any
from app.adapters.perth_adapter import PerThWatermarkAdapter
from app.models.schemas import WatermarkDetectionResult

class WatermarkDetectionService:
    def __init__(self):
        self.adapter = PerThWatermarkAdapter()

    def analyze_watermark(self, audio_path: str) -> WatermarkDetectionResult:
        res = self.adapter.detect_watermark(audio_path)
        return WatermarkDetectionResult(
            method_name=res.get("method_name", "Detector de marca de procedencia experimental"),
            status=res.get("status", "indeterminado"),
            detected=res.get("detected"),
            correlation_score=res.get("correlation_score", 0.0),
            watermark_payload=res.get("watermark_payload"),
            interpretation=res.get("interpretation", ""),
            note=res.get("note", "")
        )

watermark_detection_service = WatermarkDetectionService()
