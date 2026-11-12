import {
  SystemHealthResponse,
  VoiceGenerationResponse,
  VoiceReferenceTranscriptionResponse,
  LabAudioSample,
  AudioAnalysisResponse,
  SocialEngineeringAnalysisResponse,
  MultilayerRiskAssessmentResponse,
  ExperimentResult
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function transcribeVoiceReference(
  referenceAudioId: string,
  consentGranted: boolean,
  clipStartSeconds?: number,
  clipEndSeconds?: number
): Promise<VoiceReferenceTranscriptionResponse> {
  const res = await fetch(`${API_BASE}/generation/transcribe-reference`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reference_audio_id: referenceAudioId,
      consent_granted: consentGranted,
      clip_start_seconds: clipStartSeconds,
      clip_end_seconds: clipEndSeconds,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error en la transcripción local" }));
    throw new Error(err.detail || "Error transcribiendo la referencia");
  }
  return res.json();
}

export async function fetchHealth(): Promise<SystemHealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("Error consultando estado de salud del sistema");
  return res.json();
}

export async function fetchLabSamples(): Promise<LabAudioSample[]> {
  const res = await fetch(`${API_BASE}/samples`);
  if (!res.ok) throw new Error("Error cargando muestras de evaluación");
  return res.json();
}

export async function synthesizeVoice(data: {
  text: string;
  reference_audio_id: string;
  reference_transcript: string;
  consent_granted: boolean;
  speaker_alias?: string;
  apply_perth_watermark?: boolean;
  cfg_strength?: number;
  nfe_step?: number;
  speed?: number;
}): Promise<VoiceGenerationResponse> {
  const res = await fetch(`${API_BASE}/generation/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error en la síntesis" }));
    throw new Error(err.detail || "Error en la generación sintética");
  }
  return res.json();
}

export async function uploadVoiceReference(formData: FormData): Promise<any> {
  const res = await fetch(`${API_BASE}/generation/upload-reference`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error cargando archivo" }));
    throw new Error(err.detail || "Error al subir referencia");
  }
  return res.json();
}

export async function analyzeAudioSample(sampleName: string): Promise<AudioAnalysisResponse> {
  const res = await fetch(`${API_BASE}/detection/analyze-sample/${sampleName}`);
  if (!res.ok) throw new Error("Error analizando muestra de audio");
  return res.json();
}

export async function analyzeUploadedAudio(file: File): Promise<AudioAnalysisResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/detection/analyze-file`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error analizando archivo" }));
    throw new Error(err.detail || "Error analizando audio");
  }
  return res.json();
}

export async function analyzeSocialEngineeringText(
  transcript: string,
  audioId?: string
): Promise<SocialEngineeringAnalysisResponse> {
  const res = await fetch(`${API_BASE}/social-engineering/analyze-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, audio_id: audioId })
  });
  if (!res.ok) throw new Error("Error analizando factores semánticos");
  return res.json();
}

export async function evaluateComprehensiveRisk(
  sampleName: string,
  verifiedIdentity: boolean,
  customTranscript?: string
): Promise<MultilayerRiskAssessmentResponse> {
  const res = await fetch(`${API_BASE}/risk-assessment/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sample_name: sampleName,
      verified_identity: verifiedIdentity,
      custom_transcript: customTranscript
    })
  });
  if (!res.ok) throw new Error("Error en la evaluación de confianza multicapa");
  return res.json();
}

export async function runBenchmarkExperiment(
  humanSample: string = "scenario_c.wav",
  synthSample: string = "scenario_a.wav"
): Promise<ExperimentResult> {
  const res = await fetch(`${API_BASE}/experiments/run-benchmark`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      human_sample: humanSample,
      synthetic_sample: synthSample
    })
  });
  if (!res.ok) throw new Error("Error ejecutando benchmark experimental");
  return res.json();
}

export async function purgeLabData(): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/clear-lab-data`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Error eliminando datos del laboratorio");
  return res.json();
}

export function getAudioUrl(filename: string): string {
  if (!filename) return "";
  if (
    filename.startsWith("blob:") ||
    filename.startsWith("http://") ||
    filename.startsWith("https://") ||
    filename.startsWith("data:")
  ) {
    return filename;
  }
  const cleanName = filename.replace(/^\/api\/audio\//, "");
  return `http://localhost:8000/api/audio/${cleanName}`;
}
