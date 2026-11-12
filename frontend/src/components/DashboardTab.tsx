"use client";

import React from "react";
import {
  Cpu,
  Mic,
  Layers,
  ArrowRight,
  Sparkles,
  AudioWaveform
} from "lucide-react";
import { SystemHealthResponse } from "@/lib/types";

interface DashboardTabProps {
  health: SystemHealthResponse | null;
  onNavigate: (tab: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ health, onNavigate }) => {
  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyber-850 via-cyber-900 to-black p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-xs font-semibold text-cyan-300 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Trabajo Universitario — Licenciatura en Seguridad Informática</span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            VoiceShield <span className="text-cyan-400">Lab</span>
          </h1>
          <p className="mt-2 text-lg font-medium text-slate-300">
            Clonación autorizada de voz y análisis de audio para investigar amenazas de ingeniería social.
          </p>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed">
            Plataforma académica local para generar clones con consentimiento y evaluar audios con detección acústica,
            marcas de procedencia PerTh, análisis semántico y verificación fuera de banda.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate("generation")}
              className="flex items-center space-x-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-black hover:bg-cyan-400 transition"
            >
              <span>Ir al Laboratorio de Generación</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onNavigate("confidence")}
              className="flex items-center space-x-2 rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
            >
              <span>Matriz de Confianza Multicapa</span>
            </button>
          </div>
        </div>
      </div>

      {/* Core laboratory capabilities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="cyber-panel p-5 border-cyan-500/20">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 mb-4">
            <Mic className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">1. Generación Ética</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Síntesis neuronal directa desde texto, condicionada por una referencia autorizada cuando está disponible.
            El F0 se informa como medición; el modelo conserva su entonación natural.
          </p>
        </div>

        <div className="cyber-panel p-5 border-amber-500/20">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-400 mb-4">
            <AudioWaveform className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">2. Análisis de Audio</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Analiza muestras propias y audios de referencia con AASIST, examina marcas PerTh y prueba la robustez ante ruido y compresión.
          </p>
        </div>

        <div className="cyber-panel p-5 border-emerald-500/20">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 mb-4">
            <Layers className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">3. Evaluación Multicapa</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Combina evidencia acústica y semántica con verificación de identidad por un canal independiente.
          </p>
        </div>
      </div>

      {/* Models Status & Infrastructure */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Cpu className="h-5 w-5 text-cyan-400" />
            <span>Estado de Modelos y Adaptadores Locales</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {health?.hardware ? `${health.hardware.os} | ${health.hardware.architecture} | ${health.hardware.acceleration}` : "Cargando hardware..."}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Gemma 3 4B */}
          <div className="rounded-xl border border-slate-800 bg-cyber-850 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">LLM Semántico</span>
              <span className={`h-2 w-2 rounded-full ${health?.models?.ollama_gemma3?.available ? "bg-emerald-400" : "bg-amber-400"}`} />
            </div>
            <div className="text-sm font-bold text-white mb-1">Gemma 3 4B</div>
            <p className="text-[11px] text-slate-400 leading-tight">
              {health?.models?.ollama_gemma3?.status_message || "Evaluando servicio Ollama (11434)"}
            </p>
          </div>

          {/* F5-TTS */}
          <div className="rounded-xl border border-slate-800 bg-cyber-850 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">Síntesis / Clonación</span>
              <span className={`h-2 w-2 rounded-full ${health?.models?.f5_tts?.available ? "bg-emerald-400" : "bg-amber-400"}`} />
            </div>
            <div className="text-sm font-bold text-white mb-1">F5-TTS Español</div>
            <p className="text-[11px] text-slate-400 leading-tight">
              {health?.models?.f5_tts?.status_message || "Requiere instalar F5-TTS y descargar el checkpoint"}
            </p>
          </div>

          {/* faster-whisper */}
          <div className="rounded-xl border border-slate-800 bg-cyber-850 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">Transcripción STT</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            <div className="text-sm font-bold text-white mb-1">faster-whisper</div>
            <p className="text-[11px] text-slate-400 leading-tight">
              {health?.models?.faster_whisper?.status_message || "Español prioritario int8"}
            </p>
          </div>

          {/* AASIST */}
          <div className="rounded-xl border border-slate-800 bg-cyber-850 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">Detección Acústica</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            <div className="text-sm font-bold text-white mb-1">AASIST v2.1</div>
            <p className="text-[11px] text-slate-400 leading-tight">
              {health?.models?.aasist_detector?.status_message || "Clasificador acústico activo"}
            </p>
          </div>

          {/* PerTh Watermark */}
          <div className="rounded-xl border border-slate-800 bg-cyber-850 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">Procedencia</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            <div className="text-sm font-bold text-white mb-1">PerTh Engine</div>
            <p className="text-[11px] text-slate-400 leading-tight">
              {health?.models?.perth_watermark?.status_message || "Spread Spectrum imperceptible"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
