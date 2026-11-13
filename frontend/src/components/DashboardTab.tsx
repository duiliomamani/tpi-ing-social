"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  AudioWaveform,
  Bot,
  CheckCircle2,
  Cpu,
  Info,
  Layers,
  Mic,
  Play,
  Sparkles,
  ShieldCheck,
  TriangleAlert,
  type LucideIcon,
  Upload,
  UserRound
} from "lucide-react";
import { LabAudioSample, SystemHealthResponse } from "@/lib/types";
import { fetchLabSamples } from "@/lib/api";

interface DashboardTabProps {
  health: SystemHealthResponse | null;
  onNavigate: (tab: string) => void;
  onRunScenario: (sample: LabAudioSample) => void;
  onCreateControl: () => void;
}

const WORKFLOW_STEPS = [
  {
    number: "01",
    title: "Preparar una muestra",
    description: "Elegí un caso disponible o generá una voz sintética con una referencia autorizada.",
    destination: "generation",
    action: "Preparar audio",
    icon: Mic,
    color: "cyan"
  },
  {
    number: "02",
    title: "Analizar la señal",
    description: "Ejecutá AASIST y PerTh sobre el mismo audio para revisar evidencia de síntesis y procedencia.",
    destination: "detection",
    action: "Abrir análisis",
    icon: AudioWaveform,
    color: "amber"
  },
  {
    number: "03",
    title: "Evaluar el caso",
    description: "Revisá la transcripción, analizá la intención y registrá la verificación por un canal independiente.",
    destination: "confidence",
    action: "Abrir evaluación",
    icon: Layers,
    color: "emerald"
  },
  {
    number: "04",
    title: "Comparar y documentar",
    description: "Medí la robustez ante ruido, compresión y filtro telefónico; exportá el informe de sesión.",
    destination: "experiments",
    action: "Abrir benchmark",
    icon: Activity,
    color: "amber"
  }
];

const MODEL_CARDS = [
  { key: "f5_tts", group: "Síntesis y clonación", name: "F5-TTS Español", fallback: "Requiere instalar el motor y descargar el checkpoint" },
  { key: "faster_whisper", group: "Transcripción local", name: "faster-whisper", fallback: "Transcripción local para referencias y audios" },
  { key: "aasist_detector", group: "Detección acústica", name: "AASIST", fallback: "Clasificador acústico del laboratorio" },
  { key: "perth_watermark", group: "Procedencia de audio", name: "PerTh", fallback: "Verificación local de marca perceptual" },
  { key: "ollama_gemma3", group: "Análisis semántico", name: "Gemma 3 · Ollama", fallback: "Requiere iniciar Ollama con el modelo configurado" }
] as const;

const STATUS_STYLE = {
  available: { dot: "bg-emerald-400", text: "Disponible", label: "text-emerald-300" },
  unavailable: { dot: "bg-rose-400", text: "No disponible", label: "text-rose-300" },
  pending: { dot: "bg-slate-500", text: "Consultando", label: "text-slate-400" }
};

interface VoiceIntentCell {
  intent: string;
  title: string;
  description: string;
  evidence: string;
  scenarioCodes: string[];
  needsSyntheticControl: boolean;
  tone: "cyan" | "rose" | "emerald" | "amber";
}

interface VoiceIntentRow {
  key: string;
  label: string;
  detail: string;
  icon: LucideIcon;
  cells: VoiceIntentCell[];
}

const VOICE_INTENT_ROWS: VoiceIntentRow[] = [
  {
    key: "synthetic",
    label: "Voz generada por IA",
    detail: "Autenticidad acústica",
    icon: Bot,
    cells: [
      {
        intent: "Llamada normal",
        title: "Uso legítimo posible",
        description: "Un asistente virtual puede hablar con voz sintética sin que exista una intención fraudulenta.",
        evidence: "No hay una grabación de control en el catálogo; podés crearla con una referencia autorizada.",
        scenarioCodes: [],
        needsSyntheticControl: true,
        tone: "cyan",
      },
      {
        intent: "Pedido sospechoso",
        title: "Engaño con IA",
        description: "Una voz clonada suplanta a un directivo o familiar y presiona para aprobar una transferencia.",
        evidence: "Escenarios A y B · catalogados como sintéticos y maliciosos.",
        scenarioCodes: ["scenario_a", "scenario_b"],
        needsSyntheticControl: false,
        tone: "rose",
      },
    ],
  },
  {
    key: "human",
    label: "Voz humana",
    detail: "Persona real",
    icon: UserRound,
    cells: [
      {
        intent: "Llamada normal",
        title: "Comunicación legítima",
        description: "Una persona coordina una tarea cotidiana sin urgencia, pedido sensible ni evasión de controles.",
        evidence: "Escenario C · catalogado como voz humana legítima.",
        scenarioCodes: ["scenario_c"],
        needsSyntheticControl: false,
        tone: "emerald",
      },
      {
        intent: "Pedido sospechoso",
        title: "Engaño sin IA",
        description: "Una persona se hace pasar por soporte y solicita un código OTP/MFA o una acción sensible.",
        evidence: "Escenario D · catalogado como voz humana maliciosa.",
        scenarioCodes: ["scenario_d"],
        needsSyntheticControl: false,
        tone: "amber",
      },
    ],
  },
];

const MATRIX_TONES = {
  cyan: {
    card: "border-cyan-500/25 bg-cyan-950/20",
    badge: "bg-cyan-500/15 text-cyan-200",
    dot: "bg-cyan-400",
  },
  rose: {
    card: "border-rose-500/30 bg-rose-950/20",
    badge: "bg-rose-500/15 text-rose-200",
    dot: "bg-rose-400",
  },
  emerald: {
    card: "border-emerald-500/25 bg-emerald-950/20",
    badge: "bg-emerald-500/15 text-emerald-200",
    dot: "bg-emerald-400",
  },
  amber: {
    card: "border-amber-500/25 bg-amber-950/20",
    badge: "bg-amber-500/15 text-amber-200",
    dot: "bg-amber-400",
  },
} as const;

export const DashboardTab: React.FC<DashboardTabProps> = ({ health, onNavigate, onRunScenario, onCreateControl }) => {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyber-850 via-cyber-900 to-black p-6 shadow-2xl sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative z-10 max-w-3xl">
          <div className="mb-4 inline-flex items-center space-x-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Laboratorio universitario · Inferencia local</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            VoiceShield <span className="text-cyan-400">Lab</span>
          </h1>
          <p className="mt-2 text-lg font-medium text-slate-200">
            Clonación autorizada de voz y análisis forense para una demo reproducible.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Seguí el audio desde una referencia consentida hasta la evaluación de riesgo. Los resultados son evidencia para el análisis académico, no una certeza automática.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate("generation")}
              className="flex items-center space-x-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-xs font-bold text-black transition hover:bg-cyan-400"
            >
              <span>Comenzar recorrido</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate("experiments")}
              className="flex items-center space-x-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-700"
            >
              <Activity className="h-3.5 w-3.5 text-cyan-300" />
              <span>Ver benchmark acústico</span>
            </button>
          </div>
        </div>
      </section>

      <VoiceIntentMatrix
        onNavigate={onNavigate}
        onRunScenario={onRunScenario}
        onCreateControl={onCreateControl}
      />

      <section className="space-y-4" aria-labelledby="workflow-heading">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-400">Recorrido recomendado</p>
          <h2 id="workflow-heading" className="mt-1 text-lg font-bold text-white">De la muestra a una decisión defensiva</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {WORKFLOW_STEPS.map((step) => {
            const Icon = step.icon;
            const colorClasses = step.color === "amber"
              ? "border-amber-500/20 bg-amber-950/40 text-amber-300"
              : step.color === "emerald"
              ? "border-emerald-500/20 bg-emerald-950/40 text-emerald-300"
              : "border-cyan-500/20 bg-cyan-950/40 text-cyan-300";

            return (
              <button
                key={step.number}
                type="button"
                onClick={() => onNavigate(step.destination)}
                className="group cyber-panel flex h-full flex-col p-5 text-left transition hover:-translate-y-0.5 hover:border-cyan-500/40 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <div className="flex w-full items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${colorClasses}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-xs text-slate-500">{step.number}</span>
                </div>
                <h3 className="mt-4 text-sm font-bold text-white">{step.title}</h3>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-400">{step.description}</p>
                <span className="mt-4 inline-flex items-center space-x-1.5 text-xs font-semibold text-cyan-300">
                  <span>{step.action}</span>
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="models-heading">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-400">Diagnóstico del entorno</p>
            <h2 id="models-heading" className="mt-1 flex items-center space-x-2 text-lg font-bold text-white">
              <Cpu className="h-5 w-5 text-cyan-400" />
              <span>Servicios y modelos locales</span>
            </h2>
          </div>
          <span className="text-xs text-slate-400 sm:text-right">
            {health?.hardware
              ? `${health.hardware.os} · ${health.hardware.architecture} · ${health.hardware.acceleration}`
              : "Conectando con el backend local…"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {MODEL_CARDS.map((model) => {
            const modelStatus = health?.models?.[model.key];
            const availability = modelStatus ? (modelStatus.available ? "available" : "unavailable") : "pending";
            const style = STATUS_STYLE[availability];

            return (
              <article key={model.key} className="rounded-xl border border-slate-800 bg-cyber-850 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-300">{model.group}</span>
                  <span className={`inline-flex shrink-0 items-center space-x-1.5 text-[10px] font-medium ${style.label}`}>
                    <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                    <span>{style.text}</span>
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">{model.name}</h3>
                <p className="mt-1 min-h-8 text-[11px] leading-snug text-slate-400">
                  {modelStatus?.status_message || model.fallback}
                </p>
                {modelStatus?.device && <p className="mt-2 text-[10px] font-mono text-slate-500">{modelStatus.device}</p>}
              </article>
            );
          })}
        </div>
        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-500" />
          La disponibilidad se consulta al backend. Si un componente figura como no disponible, la interfaz puede abrirse igual, pero esa etapa no podrá ejecutarse.
        </p>
      </section>
    </div>
  );
};

interface VoiceIntentMatrixProps {
  onNavigate: (tab: string) => void;
  onRunScenario: (sample: LabAudioSample) => void;
  onCreateControl: () => void;
}

function VoiceIntentMatrix({ onNavigate, onRunScenario, onCreateControl }: VoiceIntentMatrixProps) {
  const [samples, setSamples] = useState<LabAudioSample[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(true);
  const [samplesError, setSamplesError] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    fetchLabSamples()
      .then((result) => {
        if (!isCurrent) return;
        setSamples(result);
        setSamplesError(false);
      })
      .catch(() => {
        if (isCurrent) setSamplesError(true);
      })
      .finally(() => {
        if (isCurrent) setSamplesLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const readyCellCount = VOICE_INTENT_ROWS.flatMap((row) => row.cells).filter((cell) =>
    cell.scenarioCodes.some((code) => samples.some((sample) => sample.code === code && sample.audio_available))
  ).length;

  return (
    <section className="space-y-4" aria-labelledby="voice-intent-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-400">Matriz de escenarios</p>
          <h2 id="voice-intent-heading" className="mt-1 text-lg font-bold text-white">Tipo de voz × propósito de la llamada</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">
            Ejecutá un caso para analizar audio, procedencia, contenido y verificación. La matriz organiza escenarios; la evaluación entrega evidencia, no una certeza automática.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-[10px] font-semibold text-slate-300" aria-live="polite">
          <span className={`h-2 w-2 rounded-full ${samplesError ? "bg-amber-400" : "bg-cyan-400"}`} />
          {samplesLoading ? "Consultando muestras…" : samplesError ? "No se pudo consultar el catálogo" : `Muestras listas: ${readyCellCount} de 4 cuadrantes`}
        </div>
      </div>

      <div role="table" aria-label="Matriz de tipo de voz e intención de la llamada" className="space-y-3">
        <div role="row" className="hidden grid-cols-[164px_repeat(2,minmax(0,1fr))] gap-3 md:grid">
          <div role="columnheader" aria-label="Tipo de voz" />
          <div role="columnheader" className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-950/30 px-4 py-3 text-xs font-bold text-emerald-200">
            <ShieldCheck className="h-4 w-4" />
            Llamada normal
          </div>
          <div role="columnheader" className="flex items-center gap-2 rounded-lg border border-rose-500/25 bg-rose-950/30 px-4 py-3 text-xs font-bold text-rose-200">
            <TriangleAlert className="h-4 w-4" />
            Pedido sospechoso
          </div>
        </div>

        {VOICE_INTENT_ROWS.map((row) => {
          const RowIcon = row.icon;
          return (
            <div key={row.key} role="rowgroup" className="grid grid-cols-1 gap-3 md:grid-cols-[164px_repeat(2,minmax(0,1fr))]">
              <div role="rowheader" className="hidden flex-col justify-center rounded-xl border border-slate-800 bg-cyber-850 p-4 md:flex">
                <RowIcon className="h-6 w-6 text-cyan-300" />
                <span className="mt-3 text-sm font-bold text-white">{row.label}</span>
                <span className="mt-1 text-[10px] text-slate-500">{row.detail}</span>
              </div>
              {row.cells.map((cell) => {
                const tone = MATRIX_TONES[cell.tone];
                const scenarioCodes = cell.scenarioCodes;
                const cellSamples = samples.filter((sample) => scenarioCodes.includes(sample.code));
                const hasUnavailableSample = cellSamples.some((sample) => !sample.audio_available);
                return (
                  <article key={`${row.key}-${cell.intent}`} role="cell" className={`rounded-xl border p-4 sm:p-5 ${tone.card}`}>
                    <div className="mb-3 flex items-center justify-between gap-3 md:hidden">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-300">
                        <RowIcon className="h-3.5 w-3.5 text-cyan-300" />
                        {row.label}
                      </span>
                      <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${tone.badge}`}>{cell.intent}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-white">{cell.title}</h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{cell.description}</p>
                        <p className="mt-3 border-t border-white/10 pt-2.5 text-[10px] leading-relaxed text-slate-400">{cell.evidence}</p>
                      </div>
                    </div>

                    {scenarioCodes.length > 0 && (
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                        {samplesLoading ? (
                          <span className="text-[10px] text-slate-500">Consultando disponibilidad del audio…</span>
                        ) : samplesError ? (
                          <span className="text-[10px] text-amber-200">No se pudo comprobar si el audio está en este equipo.</span>
                        ) : cellSamples.length === 0 ? (
                          <span className="text-[10px] text-slate-500">No hay fichas para este escenario en el catálogo.</span>
                        ) : (
                          cellSamples.map((sample) => sample.audio_available ? (
                            <button
                              key={sample.code}
                              type="button"
                              onClick={() => onRunScenario(sample)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-[10px] font-bold text-cyan-100 transition hover:bg-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                            >
                              <Play className="h-3 w-3" />
                              Ejecutar muestra {sample.code.slice(-1).toUpperCase()}
                            </button>
                          ) : (
                            <span key={sample.code} className="rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 text-[10px] text-slate-400">
                              Muestra {sample.code.slice(-1).toUpperCase()} no está en este equipo
                            </span>
                          ))
                        )}
                        {(samplesError || hasUnavailableSample || cellSamples.length === 0) && (
                          <button
                            type="button"
                            onClick={() => onNavigate("detection")}
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1.5 text-[10px] font-semibold text-slate-300 transition hover:border-cyan-500/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                          >
                            <Upload className="h-3 w-3" />
                            Cargar audio equivalente
                          </button>
                        )}
                      </div>
                    )}

                    {cell.needsSyntheticControl && (
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                        <button
                          type="button"
                          onClick={onCreateControl}
                          className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-[10px] font-bold text-cyan-100 transition hover:bg-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        >
                          <Mic className="h-3 w-3" />
                          Crear control sintético
                        </button>
                        <span className="text-[10px] text-slate-500">Requiere consentimiento y referencia propia.</span>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-cyan-500/20 bg-cyan-950/15 px-3 py-2.5 text-[11px] leading-relaxed text-slate-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
        <p>
          <strong className="text-white">Protocolo:</strong> seleccioná o generá el audio, ejecutá el análisis acústico, revisá el texto y la intención, y confirmá la identidad por un canal independiente. El botón de una muestra disponible inicia directamente la evaluación multicapa.
        </p>
      </div>
    </section>
  );
}
