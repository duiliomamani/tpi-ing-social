import numpy as np
import pytest
import soundfile as sf

from app.adapters.aasist_adapter import VoiceShieldAcousticAdapter
from app.adapters.perth_adapter import PerThWatermarkAdapter
from app.adapters.f5_tts_adapter import F5TTSAdapter
from app.adapters.chatterbox_adapter import ChatterboxAdapter
from app.adapters.gemma_adapter import GemmaAdapter
from app.core.config import settings
from app.core.database import init_db
from app.models.schemas import (
    AcousticDetectionResult,
    AudioAnalysisResponse,
    AudioVisualizationData,
    SocialEngineeringAnalysisResponse,
    SocialEngineeringFactor,
    WatermarkDetectionResult,
)
from app.services.experiment_service import experiment_service
from app.services.risk_assessment_service import risk_assessment_service
from app.services.scenario_service import scenario_service


@pytest.fixture(autouse=True)
def setup_database():
    init_db()


def write_voice(path, frequency=180.0, seconds=3.0):
    sample_rate = settings.TARGET_SAMPLE_RATE
    time = np.arange(int(sample_rate * seconds), dtype=np.float32) / sample_rate
    waveform = 0.2 * np.sin(2 * np.pi * frequency * time)
    sf.write(path, waveform, sample_rate, subtype="PCM_16")
    return path


def test_scenario_catalog_requires_valid_provenance():
    samples = scenario_service.get_all_scenarios()
    assert {sample.code for sample in samples} == {
        "scenario_a", "scenario_b", "scenario_c", "scenario_d"
    }
    assert all(sample.ground_truth_basis for sample in samples)
    for sample in samples:
        if sample.audio_available:
            assert (settings.AUDIO_SAMPLES_DIR / sample.audio_file).is_file()


def test_voice_shield_acoustic_detector_reports_engine(tmp_path):
    sample_path = write_voice(tmp_path / "sample.wav")
    result = VoiceShieldAcousticAdapter().detect_synthetic(str(sample_path))
    assert result["model_name"] == "VoiceShield Acoustic Prototype"
    assert result["engine_used"]
    assert result["is_calibrated"] is False
    assert result["verdict"] in {
        "Indicadores compatibles con síntesis",
        "Indicadores compatibles con voz humana",
        "Resultado indeterminado",
    }
    assert result["limitations"]


def test_provenance_adapter_reports_method_and_status(tmp_path):
    source = write_voice(tmp_path / "source.wav", frequency=220.0, seconds=4.0)
    marked = tmp_path / "marked.wav"
    adapter = PerThWatermarkAdapter()
    assert adapter.embed_watermark(str(source), str(marked)) is True
    result = adapter.detect_watermark(str(marked))
    assert result["method_name"]
    assert result["status"] in {"detectado", "no_detectado", "indeterminado"}
    assert "no prueba" in result["note"].lower() or "no demuestra" in result["note"].lower()


def test_heuristic_social_engineering_factors_are_labeled_as_fallback():
    adapter = GemmaAdapter()
    sample_text = (
        "Hola Carlos, soy el Director General. Necesito que hagas una transferencia urgente ya mismo "
        "y me pases el código OTP de seis dígitos. No cortes ni llames a nadie."
    )
    result = adapter._heuristic_analysis(sample_text)
    assert result["total_detected_factors"] >= 3
    assert result["semantic_risk_score"] > 50.0
    assert "heuristic_rule_engine" in result["analyzer_engine"]
    detected_ids = {factor["factor_id"] for factor in result["factors"] if factor["estado"] == "detectado"}
    assert "autoridad_declarada" in detected_ids
    assert "urgencia_artificial" in detected_ids
    assert detected_ids.intersection({"solicitud_informacion_sensible", "solicitud_pagos_transferencias"})


def test_sensitive_request_rule_does_not_depend_on_voice_origin():
    acoustic = AudioAnalysisResponse(
        audio_id="scenario_d",
        filename="scenario_d.wav",
        acoustic_detection=AcousticDetectionResult(
            model_name="VoiceShield Acoustic Prototype",
            model_version="spectral-baseline-v1",
            engine_used="VoiceShield experimental spectral-acoustic baseline",
            raw_score=-1.8,
            is_calibrated=False,
            verdict="Indicadores compatibles con voz humana",
            decision_threshold=0.0,
            technical_interpretation="Señales compatibles con voz humana; no autentica identidad.",
            limitations=["Score no calibrado"],
            inference_time_ms=12.0,
        ),
        watermark_detection=WatermarkDetectionResult(
            method_name="Firma spread-spectrum experimental VoiceShield",
            status="no_detectado",
            detected=False,
            correlation_score=0.0,
            interpretation="No se detectó la firma consultada.",
            note="La ausencia no demuestra origen humano.",
        ),
        visualization=AudioVisualizationData(
            waveform_peaks=[0.5] * 20,
            sample_rate=16000,
            duration=3.0,
            channels=1,
            spectrogram_summary={},
        ),
        overall_acoustic_summary="Resultado exploratorio.",
    )
    social = SocialEngineeringAnalysisResponse(
        audio_id="scenario_d",
        transcript="Dictame el código OTP para desbloquear tu cuenta.",
        transcription_engine="provided_text",
        factors=[SocialEngineeringFactor(
            factor_id="solicitud_informacion_sensible",
            factor_name="Solicitud de Información Sensible",
            estado="detectado",
            fragmento_cita="código OTP",
            explicacion="La comunicación pide un código de autenticación.",
            nivel_riesgo_contextual="alto",
        )],
        total_detected_factors=1,
        semantic_risk_score=35.0,
        semantic_risk_level="Medio",
        analyzer_engine="heuristic_rule_engine",
        untrusted_data_defense_applied=True,
        summary="Se detectó una solicitud sensible.",
    )

    result = risk_assessment_service.evaluate_risk(
        audio_id="scenario_d",
        acoustic_analysis=acoustic,
        social_analysis=social,
        verified_identity=False,
    )
    assert result.operational_risk_level == "ALTO"
    assert "REGLA DE ORO" in result.applied_rule
    assert "DETENER LA ACCIÓN" in result.operational_recommendation
    assert all(
        dimension.risk_contribution == "neutro"
        for dimension in result.dimensions
        if dimension.dimension_code in {"A_acustica", "B_procedencia"}
    )


def test_experiment_reports_small_derived_dataset(tmp_path):
    human_path = write_voice(tmp_path / "human.wav", frequency=160.0, seconds=3.0)
    synthetic_path = write_voice(tmp_path / "synthetic.wav", frequency=260.0, seconds=3.0)
    result = experiment_service.run_comparative_experiment(
        human_sample_path=str(human_path),
        synth_sample_path=str(synthetic_path),
    )
    assert result.metrics.total_samples == 8
    assert result.confusion_matrix.true_positives + result.confusion_matrix.false_negatives == 4
    assert result.confusion_matrix.true_negatives + result.confusion_matrix.false_positives == 4
    assert len(result.eer_curve_points) > 0
    assert result.detector_engine
    assert "no son ocho hablantes independientes" in result.dataset_summary


def test_chatterbox_import_remains_f5_compatibility_alias():
    assert ChatterboxAdapter is F5TTSAdapter
