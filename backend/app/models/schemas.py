from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, field_validator

# ==================== Health & Status ====================
class ModelStatus(BaseModel):
    name: str
    available: bool
    status_message: str
    device: str
    details: Optional[Dict[str, Any]] = None

class SystemHealthResponse(BaseModel):
    app_name: str
    version: str
    models: Dict[str, ModelStatus]
    hardware: Dict[str, Any]

# ==================== Voice Generation ====================
class VoiceGenerationRequest(BaseModel):
    text: str = Field(..., min_length=3, max_length=1000, description="Texto en español a sintetizar")
    reference_audio_id: str = Field(
        ...,
        pattern=r"^ref_[0-9a-f]{10}$",
        description="ID del audio de referencia cargado",
    )
    reference_transcript: str = Field(..., min_length=1, max_length=2000, description="Transcripción literal del audio de referencia")
    consent_granted: bool = Field(..., description="Consentimiento expreso e informado del titular de la voz")
    speaker_alias: str = Field("Participante Autorizado", description="Alias de la persona titular")
    apply_perth_watermark: bool = Field(True, description="Embeber marca de agua perceptual PerTh")
    cfg_strength: float = Field(2.0, ge=0.0, le=5.0, description="Guía de generación de F5-TTS")
    nfe_step: int = Field(16, ge=16, le=64, description="Pasos de inferencia de F5-TTS; 16 recomendado para demo local")
    speed: float = Field(1.0, ge=0.75, le=1.25, description="Velocidad de reproducción de F5-TTS")

    @field_validator("reference_transcript")
    @classmethod
    def reference_transcript_must_contain_words(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("La transcripción literal de la referencia es obligatoria.")
        return value

class VoiceReferenceTranscriptionRequest(BaseModel):
    reference_audio_id: str = Field(
        ...,
        pattern=r"^ref_[0-9a-f]{10}$",
        description="ID del audio de referencia cargado",
    )
    consent_granted: bool = Field(..., description="Consentimiento para procesar la muestra de voz")
    clip_start_seconds: Optional[float] = Field(None, ge=0, description="Inicio del recorte manual en segundos")
    clip_end_seconds: Optional[float] = Field(None, gt=0, description="Fin del recorte manual en segundos")

class VoiceReferenceTranscriptionResponse(BaseModel):
    source_audio_id: str
    reference_audio_id: str
    source_transcript: str
    reference_transcript: str
    audio_url: str
    source_duration_seconds: float
    duration_seconds: float
    sample_rate: int
    channels: int
    clip_start_seconds: float
    clip_end_seconds: float
    language: str
    language_probability: float
    transcription_time_ms: float
    engine: str

class VoiceGenerationResponse(BaseModel):
    audio_id: str
    filename: str
    audio_url: str
    duration_seconds: float
    sample_rate: int
    creator_model: str
    is_synthetic: bool
    watermark_embedded: bool
    academic_banner: str
    generation_time_ms: float
    message: str
    ref_pitch_hz: Optional[float] = None
    cloned_pitch_hz: Optional[float] = None
    pitch_correction_semitones: Optional[float] = None

class VoiceGenerationJobResponse(BaseModel):
    job_id: str
    status: Literal["queued", "running", "completed", "failed"]
    phase_message: str
    created_at: str
    updated_at: str
    result: Optional[VoiceGenerationResponse] = None
    error: Optional[str] = None

# ==================== Lab Audio Samples ====================
class LabAudioSample(BaseModel):
    id: str
    code: Literal["scenario_a", "scenario_b", "scenario_c", "scenario_d"]
    title: str
    category: str
    description: str
    caller_name: str
    caller_role: str
    caller_phone_display: str
    audio_file: str
    audio_url: str
    audio_available: bool = True
    duration_seconds: float
    ground_truth_voice: Literal["synthetic", "human"]
    ground_truth_intent: Literal["malicious", "legitimate"]
    transcript: str
    pedagogical_objective: str
    default_verification_state: bool = False

# ==================== Acoustic & Watermark Detection ====================
class SpectrogramPoint(BaseModel):
    time_bin: float
    frequencies: List[float]

class AudioVisualizationData(BaseModel):
    waveform_peaks: List[float]
    sample_rate: int
    duration: float
    channels: int
    spectrogram_summary: Dict[str, Any]

class AASISTDetectionResult(BaseModel):
    model_name: str
    model_version: str
    raw_score: float = Field(..., description="Puntaje técnico logit/score sin calibrar (NO probabilidad porcentual)")
    is_calibrated: bool = False
    verdict: Literal["Evidencia de síntesis", "Evidencia compatible con voz humana", "Resultado indeterminado"]
    decision_threshold: float
    technical_interpretation: str
    limitations: List[str]
    inference_time_ms: float

class WatermarkDetectionResult(BaseModel):
    method_name: str = "PerTh (Perceptual Threshold)"
    status: Literal["detectado", "no_detectado", "indeterminado"]
    detected: Optional[bool]
    correlation_score: float
    watermark_payload: Optional[str] = None
    interpretation: str
    note: str

class AudioAnalysisResponse(BaseModel):
    audio_id: str
    filename: str
    acoustic_detection: AASISTDetectionResult
    watermark_detection: WatermarkDetectionResult
    visualization: AudioVisualizationData
    overall_acoustic_summary: str

# ==================== Social Engineering (Gemma) ====================
class SocialEngineeringFactor(BaseModel):
    factor_id: str
    factor_name: str
    estado: Literal["detectado", "no_detectado", "evidencia_insuficiente"]
    fragmento_cita: Optional[str] = Field(None, description="Cita textual del audio transcripto que fundamenta el hallazgo")
    explicacion: str = Field(..., description="Explicación accesible y fundamentada")
    nivel_riesgo_contextual: Literal["bajo", "medio", "alto", "critico"]

class SocialEngineeringAnalysisResponse(BaseModel):
    audio_id: Optional[str]
    transcript: str
    transcription_engine: str
    factors: List[SocialEngineeringFactor]
    total_detected_factors: int
    semantic_risk_score: float = Field(..., ge=0.0, le=100.0, description="Puntuación de riesgo semántico (0-100)")
    semantic_risk_level: Literal["Bajo", "Medio", "Alto", "Crítico"]
    analyzer_engine: str
    untrusted_data_defense_applied: bool = True
    summary: str

# ==================== Multilayer Confidence Matrix ====================
class DimensionEvidence(BaseModel):
    dimension_code: Literal["A_acustica", "B_procedencia", "C_ingenieria_social", "D_verificacion_identidad"]
    dimension_name: str
    indicator_summary: str
    risk_contribution: Literal["bajo", "medio", "alto", "critico", "neutro"]
    technical_detail: str

class MultilayerRiskAssessmentResponse(BaseModel):
    audio_id: str
    dimensions: List[DimensionEvidence]
    social_analysis: Optional[SocialEngineeringAnalysisResponse] = None
    verified_identity: bool
    sensitive_request_detected: bool
    operational_risk_level: Literal["BAJO", "MEDIO", "ALTO", "CRITICO"]
    operational_recommendation: str
    action_protocol: List[str]
    applied_rule: str
    scientific_disclaimer: str

# ==================== Comparative Experimentation ====================
class ConfusionMatrixData(BaseModel):
    true_positives: int
    true_negatives: int
    false_positives: int
    false_negatives: int

class ExperimentMetrics(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    false_positive_rate: float
    false_negative_rate: float
    equal_error_rate_estimate: Optional[float]
    total_samples: int
    conditions_tested: List[str]

class ExperimentResult(BaseModel):
    experiment_id: str
    title: str
    confusion_matrix: ConfusionMatrixData
    metrics: ExperimentMetrics
    eer_curve_points: List[Dict[str, float]]
    timestamp: str
    evaluation_notes: str
