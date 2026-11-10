"use client";

import React from "react";
import {
  ShieldCheck,
  Cpu,
  Brain,
  Mic,
  Waves,
  Fingerprint,
  ArrowRight,
  Sparkles,
  AlertTriangle
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
            Ingeniería social asistida por IA: clonación de voz (vishing) y detección de llamadas fraudulentas.
          </p>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed">
            Plataforma académica experimental para la comprensión de los tres vectores de la amenaza:
            <strong className="text-cyan-300"> 1) Generación</strong> de clones de voz autorizados,
            <strong className="text-amber-300"> 2) Simulación</strong> controlada de ingeniería social telefónica (vishing), y
            <strong className="text-emerald-300"> 3) Defensa en profundidad</strong> mediante detección acústica AASIST,
            marcas de agua PerTh y análisis semántico con Gemma 3 4B.
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
              onClick={() => onNavigate("simulation")}
              className="flex items-center space-x-2 rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
            >
              <span>Ver Simulador de Vishing</span>
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

      {/* 3 Academic Pillars Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="cyber-panel p-5 border-cyan-500/20">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 mb-4">
            <Mic className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">1. Generación Ética</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Clonación acústica zero-shot mediante Chatterbox Multilingual V3. Exige consentimiento expreso firmado,
            perfila la frecuencia fundamental de la voz autorizada y embebe marcas de agua auditables.
          </p>
        </div>

        <div className="cyber-panel p-5 border-amber-500/20">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-400 mb-4">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">2. Ataque Simulado</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            4 escenarios pedagógicos de vishing (Suplantación de directivos, Urgencia emocional en aduanas,
            Llamada legítima y Phishing con voz humana) sin conexión telefónica externa.
          </p>
        </div>

        <div className="cyber-panel p-5 border-emerald-500/20">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 mb-4">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">3. Defensa Multicapa</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Fusión de 4 dimensiones independientes: Red AASIST (features acústicas), PerTh (procedencia espectral),
            Gemma 3 4B (8 factores de manipulación) y verificación fuera de banda (Regla de Oro).
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

          {/* Chatterbox TTS */}
          <div className="rounded-xl border border-slate-800 bg-cyber-850 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">Síntesis / Clonación</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            <div className="text-sm font-bold text-white mb-1">Chatterbox V3</div>
            <p className="text-[11px] text-slate-400 leading-tight">
              {health?.models?.chatterbox_tts?.status_message || "Motor acústico local listo"}
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
