export const MAX_AUDIO_UPLOAD_BYTES = 100 * 1024 * 1024;
export const MAX_VOICE_SOURCE_DURATION_SECONDS = 10 * 60;

export interface AudioFilePreflight {
  name: string;
  sizeBytes: number;
  mimeType: string;
  durationSeconds: number | null;
}

const AUDIO_EXTENSION = /\.(wav|mp3|m4a|ogg|opus|webm|flac|aac|aiff?)$/i;

export async function inspectAudioFile(
  file: File,
  limits: { minDurationSeconds?: number; maxDurationSeconds?: number } = {}
): Promise<AudioFilePreflight> {
  if (file.size <= 0) throw new Error("El archivo está vacío.");
  if (file.size > MAX_AUDIO_UPLOAD_BYTES) {
    throw new Error("El archivo supera el límite de 100 MB. Elegí un audio más liviano.");
  }
  if (!file.type.startsWith("audio/") && !AUDIO_EXTENSION.test(file.name)) {
    throw new Error("El archivo no parece ser un formato de audio compatible.");
  }

  const durationSeconds = await readDuration(file);
  if (durationSeconds !== null && limits.minDurationSeconds && durationSeconds < limits.minDurationSeconds) {
    throw new Error(`El audio debe durar al menos ${limits.minDurationSeconds} segundo(s).`);
  }
  if (durationSeconds !== null && limits.maxDurationSeconds && durationSeconds > limits.maxDurationSeconds) {
    throw new Error(`El audio dura ${formatDuration(durationSeconds)}; el máximo es ${formatDuration(limits.maxDurationSeconds)}.`);
  }

  return {
    name: file.name,
    sizeBytes: file.size,
    mimeType: file.type || "Tipo no informado",
    durationSeconds,
  };
}

async function readDuration(file: File): Promise<number | null> {
  if (typeof Audio === "undefined" || typeof URL.createObjectURL !== "function") return null;
  const previewUrl = URL.createObjectURL(file);
  try {
    return await new Promise<number | null>((resolve) => {
      const audio = new Audio();
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        const duration = audio.duration;
        audio.removeAttribute("src");
        audio.load();
        resolve(Number.isFinite(duration) ? duration : null);
      };
      audio.onerror = () => resolve(null);
      audio.src = previewUrl;
    });
  } finally {
    URL.revokeObjectURL(previewUrl);
  }
}

export function formatAudioFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024 * 1024) return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}
