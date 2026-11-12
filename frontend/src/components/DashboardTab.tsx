"use client";

import React from "react";
import {
  Activity,
  ArrowRight,
  AudioWaveform,
  CheckCircle2,
  Cpu,
  Layers,
  Mic,
  Sparkles
} from "lucide-react";
import { SystemHealthResponse } from "@/lib/types";

interface DashboardTabProps {
  health: SystemHealthResponse | null;
  onNavigate: (tab: string) => void;
}

const WORKFLOW_STEPS = [
  {
    number: "01",
    title: "Generar con autorización",
    description: "Cargá una referencia propia, revisá la transcripción y generá un audio de prueba.",
    destination: "generation",
    action: "Abrir generación",
    icon: Mic,
    color: "cyan"
  },
  {
    number: "02",
    title: "Analizar la evidencia",
    description: "Medí el audio con AASIST y buscá la marca PerTh. También podés usar una muestra de control.",
    destination: "detection",
    action: "Abrir análisis",
    icon: AudioWaveform,
    color: "amber"
  },
  {
    number: "03",
    title: "Evaluar el riesgo completo",
    description: "Combiná señales acústicas, contenido y verificación independiente de identidad.",
    destination: "confidence",
    action: "Abrir matriz",
    icon: Layers,
    color: "emerald"
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

export const DashboardTab: React.FC<DashboardTabProps> = ({ health, onNavigate }) => {
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

      <section className="space-y-4" aria-labelledby="workflow-heading">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-400">Recorrido recomendado</p>
          <h2 id="workflow-heading" className="mt-1 text-lg font-bold text-white">De la muestra a una decisión defensiva</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
