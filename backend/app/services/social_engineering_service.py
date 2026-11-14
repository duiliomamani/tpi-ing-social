from typing import Dict, Any, Optional
from app.adapters.gemma_adapter import GemmaAdapter
from app.models.schemas import SocialEngineeringAnalysisResponse, SocialEngineeringFactor

class SocialEngineeringService:
    def __init__(self):
        self.adapter = GemmaAdapter()

    def analyze(self, transcript: str, audio_id: Optional[str] = None) -> SocialEngineeringAnalysisResponse:
        result = self.adapter.analyze_social_engineering(transcript)
        
        factors = [
            SocialEngineeringFactor(
                factor_id=f["factor_id"],
                factor_name=f["factor_name"],
                estado=f["estado"],
                fragmento_cita=f.get("fragmento_cita"),
                explicacion=f["explicacion"],
                nivel_riesgo_contextual=f["nivel_riesgo_contextual"]
            )
            for f in result.get("factors", [])
        ]

        return SocialEngineeringAnalysisResponse(
            audio_id=audio_id,
            transcript=result.get("transcript", transcript),
            transcription_engine=result.get("transcription_engine", "faster-whisper"),
            factors=factors,
            total_detected_factors=result.get("total_detected_factors", 0),
            semantic_risk_score=result.get("semantic_risk_score", 0.0),
            semantic_risk_level=result.get("semantic_risk_level", "Bajo"),
            analyzer_engine=result.get("analyzer_engine", "analizador semántico local"),
            untrusted_data_defense_applied=result.get("untrusted_data_defense_applied", True),
            summary=result.get("summary", "")
        )

social_engineering_service = SocialEngineeringService()
