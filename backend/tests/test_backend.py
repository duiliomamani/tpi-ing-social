import os
import pytest
from app.core.config import settings
from app.core.database import init_db
from app.adapters.aasist_adapter import AASISTAdapter
from app.adapters.perth_adapter import PerThWatermarkAdapter
from app.adapters.gemma_adapter import GemmaAdapter
from app.services.risk_assessment_service import risk_assessment_service
from app.services.audio_detection_service import audio_detection_service
from app.services.social_engineering_service import social_engineering_service
from app.services.experiment_service import experiment_service
from app.models.schemas import (
    AudioAnalysisResponse,
    AASISTDetectionResult,
    WatermarkDetectionResult,
    AudioVisualizationData,
    SocialEngineeringAnalysisResponse,
    SocialEngineeringFactor
)

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

def test_audio_samples_exist():
    assert (settings.AUDIO_SAMPLES_DIR / "scenario_a.wav").exists()
    assert (settings.AUDIO_SAMPLES_DIR / "scenario_b.wav").exists()
    assert (settings.AUDIO_SAMPLES_DIR / "scenario_c.wav").exists()
    assert (settings.AUDIO_SAMPLES_DIR / "scenario_d.wav").exists()

def test_aasist_adapter():
    adapter = AASISTAdapter()
    res = adapter.detect_synthetic(str(settings.AUDIO_SAMPLES_DIR / "scenario_a.wav"))
    assert "raw_score" in res
    assert "verdict" in res
    assert res["is_calibrated"] is False
    assert len(res["limitations"]) > 0

def test_perth_watermark_detection():
    adapter = PerThWatermarkAdapter()
    # Scenario A has watermark
    res_a = adapter.detect_watermark(str(settings.AUDIO_SAMPLES_DIR / "scenario_a.wav"))
    assert res_a["detected"] is True
    assert res_a["status"] == "detectado"

    # Scenario C is human, does not have watermark
    res_c = adapter.detect_watermark(str(settings.AUDIO_SAMPLES_DIR / "scenario_c.wav"))
    assert res_c["detected"] is False
    assert res_c["status"] == "no_detectado"

def test_social_engineering_factors():
    adapter = GemmaAdapter()
    sample_text = (
        "Hola Carlos, soy el Director General. Necesito que hagas una transferencia urgente ya mismo "
        "y me pases el código OTP de seis dígitos. No cortes ni llames a nadie."
    )
    res = adapter.analyze_social_engineering(sample_text)
    assert res["total_detected_factors"] >= 3
    assert res["semantic_risk_score"] > 50.0
    
    # Check that authority, urgency, sensitive info, and payment are identified
    detected_ids = [f["factor_id"] for f in res["factors"] if f["estado"] == "detectado"]
    assert "autoridad_declarada" in detected_ids
    assert "urgencia_artificial" in detected_ids
    assert "solicitud_informacion_sensible" in detected_ids or "solicitud_pagos_transferencias" in detected_ids

def test_risk_assessment_golden_rule():
    # Scenario D: Voice is human, but request is sensitive and unverified
    acoustic_mock = AudioAnalysisResponse(
        audio_id="scenario_d",
        filename="scenario_d.wav",
        acoustic_detection=AASISTDetectionResult(
            model_name="AASIST",
            model_version="v2.1",
            raw_score=-1.8,  # Strongly indicates human acoustic
            is_calibrated=False,
            verdict="Evidencia compatible con voz humana",
            decision_threshold=0.0,
            technical_interpretation="Acoustic features match human vocal tract.",
            limitations=["Uncalibrated technical score"],
            inference_time_ms=12.0
        ),
        watermark_detection=WatermarkDetectionResult(
            method_name="PerTh",
            status="no_detectado",
            detected=False,
            correlation_score=0.4,
            interpretation="No watermark",
            note="Absence != human"
        ),
        visualization=AudioVisualizationData(
            waveform_peaks=[0.5] * 20,
            sample_rate=16000,
            duration=15.0,
            channels=1,
            spectrogram_summary={}
        ),
        overall_acoustic_summary="Acoustics indicate human."
    )

    social_mock = SocialEngineeringAnalysisResponse(
        audio_id="scenario_d",
        transcript="Por favor dictame el código OTP inmediatamente para desbloquear tu cuenta corporativa.",
        transcription_engine="faster-whisper",
        factors=[
            SocialEngineeringFactor(
                factor_id="solicitud_informacion_sensible",
                factor_name="Solicitud de Información Sensible",
                estado="detectado",
                fragmento_cita="dictame el código OTP",
                explicacion="Solicitud de clave OTP",
                nivel_riesgo_contextual="alto"
            )
        ],
        total_detected_factors=1,
        semantic_risk_score=75.0,
        semantic_risk_level="Alto",
        analyzer_engine="Gemma 3 4B",
        untrusted_data_defense_applied=True,
        summary="High risk OTP request"
    )

    # When identity is NOT verified, operational risk MUST BE ALTO (Golden rule)
    res_unverified = risk_assessment_service.evaluate_risk(
        audio_id="scenario_d",
        acoustic_analysis=acoustic_mock,
        social_analysis=social_mock,
        verified_identity=False
    )
    assert res_unverified.operational_risk_level == "ALTO"
    assert "REGLA DE ORO" in res_unverified.applied_rule
    assert "DETENER LA ACCIÓN" in res_unverified.operational_recommendation

def test_comparative_experiment_pipeline():
    res = experiment_service.run_comparative_experiment(
        human_sample_path=str(settings.AUDIO_SAMPLES_DIR / "scenario_c.wav"),
        synth_sample_path=str(settings.AUDIO_SAMPLES_DIR / "scenario_a.wav")
    )
    assert res.metrics.total_samples == 8
    assert res.confusion_matrix.true_positives + res.confusion_matrix.false_negatives == 4
    assert res.confusion_matrix.true_negatives + res.confusion_matrix.false_positives == 4
    assert len(res.eer_curve_points) > 0
