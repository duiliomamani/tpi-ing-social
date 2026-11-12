export interface ModelStatus {
  name: string;
  available: boolean;
  status_message: string;
  device: string;
  details?: Record<string, any>;
}

export interface SystemHealthResponse {
  app_name: string;
  version: string;
  models: Record<string, ModelStatus>;
  hardware: {
    os: string;
    architecture: string;
    python_version: string;
    acceleration: string;
    sample_rate_target: number;
  };
}

export interface VoiceGenerationResponse {
  audio_id: string;
  filename: string;
  audio_url: string;
  duration_seconds: number;
  creator_model: string;
  is_synthetic: boolean;
  watermark_embedded: boolean;
  academic_banner: string;
  generation_time_ms: number;
  message: string;
  ref_pitch_hz?: number;
  cloned_pitch_hz?: number;
  pitch_correction_semitones?: number;
}

export interface VoiceReferenceTranscriptionResponse {
  source_audio_id: string;
  reference_audio_id: string;
  source_transcript: string;
  reference_transcript: string;
  audio_url: string;
  source_duration_seconds: number;
  duration_seconds: number;
  sample_rate: number;
  channels: number;
  clip_start_seconds: number;
  clip_end_seconds: number;
  language: string;
  language_probability: number;
  transcription_time_ms: number;
  engine: string;
}

export interface LabAudioSample {
  id: string;
  code: "scenario_a" | "scenario_b" | "scenario_c" | "scenario_d";
  title: string;
  category: string;
  description: string;
  caller_name: string;
  caller_role: string;
  caller_phone_display: string;
  audio_file: string;
  audio_url: string;
  duration_seconds: number;
  ground_truth_voice: "synthetic" | "human";
  ground_truth_intent: "malicious" | "legitimate";
  transcript: string;
  pedagogical_objective: string;
  default_verification_state: boolean;
}

export interface AASISTDetectionResult {
  model_name: string;
  model_version: string;
  raw_score: number;
  is_calibrated: boolean;
  verdict: "Evidencia de síntesis" | "Evidencia compatible con voz humana" | "Resultado indeterminado";
  decision_threshold: number;
  technical_interpretation: string;
  limitations: string[];
  inference_time_ms: number;
}

export interface WatermarkDetectionResult {
  method_name: string;
  status: "detectado" | "no_detectado" | "indeterminado";
  detected: boolean | null;
  correlation_score: number;
  watermark_payload?: string | null;
  interpretation: string;
  note: string;
}

export interface AudioVisualizationData {
  waveform_peaks: number[];
  sample_rate: number;
  duration: number;
  channels: number;
  spectrogram_summary: {
    time_bins: number;
    freq_bins: number;
    duration: number;
    sample_rate: number;
    energy_matrix: number[][];
  };
}

export interface AudioAnalysisResponse {
  audio_id: string;
  filename: string;
  acoustic_detection: AASISTDetectionResult;
  watermark_detection: WatermarkDetectionResult;
  visualization: AudioVisualizationData;
  overall_acoustic_summary: string;
}

export interface SocialEngineeringFactor {
  factor_id: string;
  factor_name: string;
  estado: "detectado" | "no_detectado" | "evidencia_insuficiente";
  fragmento_cita?: string | null;
  explicacion: string;
  nivel_riesgo_contextual: "bajo" | "medio" | "alto" | "critico";
}

export interface SocialEngineeringAnalysisResponse {
  audio_id?: string;
  transcript: string;
  transcription_engine: string;
  factors: SocialEngineeringFactor[];
  total_detected_factors: number;
  semantic_risk_score: number;
  semantic_risk_level: "Bajo" | "Medio" | "Alto" | "Crítico";
  analyzer_engine: string;
  untrusted_data_defense_applied: boolean;
  summary: string;
}

export interface DimensionEvidence {
  dimension_code: "A_acustica" | "B_procedencia" | "C_ingenieria_social" | "D_verificacion_identidad";
  dimension_name: string;
  indicator_summary: string;
  risk_contribution: "bajo" | "medio" | "alto" | "critico" | "neutro";
  technical_detail: string;
}

export interface MultilayerRiskAssessmentResponse {
  audio_id: string;
  dimensions: DimensionEvidence[];
  verified_identity: boolean;
  sensitive_request_detected: boolean;
  operational_risk_level: "BAJO" | "MEDIO" | "ALTO" | "CRITICO";
  operational_recommendation: string;
  action_protocol: string[];
  applied_rule: string;
  scientific_disclaimer: string;
}

export interface ConfusionMatrixData {
  true_positives: number;
  true_negatives: number;
  false_positives: number;
  false_negatives: number;
}

export interface ExperimentMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  false_positive_rate: number;
  false_negative_rate: number;
  equal_error_rate_estimate: number | null;
  total_samples: number;
  conditions_tested: string[];
}

export interface ExperimentResult {
  experiment_id: string;
  title: string;
  confusion_matrix: ConfusionMatrixData;
  metrics: ExperimentMetrics;
  eer_curve_points: Array<{
    threshold: number;
    false_positive_rate: number;
    false_negative_rate: number;
  }>;
  timestamp: string;
  evaluation_notes: string;
}
