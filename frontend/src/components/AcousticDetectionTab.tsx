"use client";

import React, { useState } from "react";
import {
  Activity,
  Upload,
  Mic,
  Square,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Fingerprint,
  Info,
  Clock,
  Layers,
  ArrowRight
} from "lucide-react";
import { AudioAnalysisResponse } from "@/lib/types";
import { analyzeAudioSample, analyzeUploadedAudio, getAudioUrl } from "@/lib/api";
import { WaveformSpectrogram } from "./WaveformSpectrogram";
import { AudioPlayer } from "./AudioPlayer";

interface AcousticDetectionTabProps {
  initialSampleName?: string | null;
  initialTranscript?: string;
  onEvaluateAudio?: (filename: string, transcript: string) => void;
}

const REFERENCE_SAMPLE_NAMES = ["scenario_a.wav", "scenario_b.wav", "scenario_c.wav", "scenario_d.wav"];

export const AcousticDetectionTab: React.FC<AcousticDetectionTabProps> = ({
  initialSampleName,
  initialTranscript = "",
  onEvaluateAudio
}) => {
  const [selectedSample, setSelectedSample] = useState<string>(initialSampleName || "scenario_a.wav");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AudioAnalysisResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Analyze a reference sample or a clone generated in this session.
  const handleAnalyzePreloaded = async () => {
    try {
      setIsAnalyzing(true);
      setErrorMessage(null);
      const res = await analyzeAudioSample(selectedSample);
      setAnalysisResult(res);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Upload external file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzing(true);
      setErrorMessage(null);
      setAnalysisResult(null);
      const res = await analyzeUploadedAudio(file);
      setAnalysisResult(res);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Activity className="h-4 w-4" />
          <span>Módulo de Detección Acústica y Procedencia</span>
        </div>
        <h2 className="text-2xl font-black text-white">Análisis Forense de Audio Sintético</h2>
        <p className="text-xs text-slate-400 mt-1">
          Extracción espectro-temporal y clasificación mediante la red neuronal AASIST y verificación
          de marca de agua imperceptible PerTh.
        </p>
      </div>

      {/* Input Options: Select Scenario OR Upload */}
      {initialSampleName && !REFERENCE_SAMPLE_NAMES.includes(initialSampleName) && (
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-3 text-xs text-cyan-100">
          El clon recién generado quedó seleccionado. Ejecutá el análisis para comparar AASIST y PerTh.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Scenario Selection */}
        <div className="md:col-span-2 cyber-panel p-4 flex flex-col justify-between">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Seleccionar Audio del Repositorio de Laboratorio:
            </label>
            <select
              value={selectedSample}
              onChange={(e) => {
                setSelectedSample(e.target.value);
                setAnalysisResult(null);
                setErrorMessage(null);
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
            >
              {initialSampleName && !REFERENCE_SAMPLE_NAMES.includes(initialSampleName) && (
                <option value={initialSampleName}>Clon generado en esta sesión</option>
              )}
              <option value="scenario_a.wav">Muestra A — Suplantación Directiva (Sintético con Marca PerTh)</option>
              <option value="scenario_b.wav">Muestra B — Urgencia Emocional (Sintético con Marca PerTh)</option>
              <option value="scenario_c.wav">Muestra C — Coordinación Laboral (Voz Humana de Control)</option>
              <option value="scenario_d.wav">Muestra D — Solicitud de OTP con voz humana</option>
            </select>
          </div>

          <button
            onClick={handleAnalyzePreloaded}
            disabled={isAnalyzing}
            className="mt-3 flex items-center justify-center space-x-2 rounded-lg bg-cyan-500 py-2 text-xs font-bold text-black hover:bg-cyan-400 disabled:opacity-40 transition"
          >
            {isAnalyzing ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                <span>Ejecutando Inferencia AASIST & PerTh...</span>
              </>
            ) : (
              <>
                <Activity className="h-4 w-4" />
                <span>Ejecutar Pipeline Forense en Muestra</span>
              </>
            )}
          </button>
        </div>

        {/* Upload Custom Audio */}
        <div className="cyber-panel p-4 flex flex-col justify-between">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Cargar Archivo Externo:
            </label>
            <p className="text-[11px] text-slate-400 leading-tight mb-3">
              También podés subir un audio externo o un clon descargado para contrastar.
            </p>
          </div>

          <label className="flex items-center justify-center space-x-2 rounded-lg border border-slate-700 bg-slate-800/80 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer transition">
            <Upload className="h-4 w-4 text-cyan-400" />
            <span>Subir audio</span>
            <input type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/20 p-3 text-xs text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* Analysis Results Display */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Main Verdict Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* AASIST Classifier Verdict */}
            <div className={`p-5 rounded-xl border flex flex-col justify-between ${
              analysisResult.acoustic_detection.verdict === "Evidencia de síntesis"
                ? "border-rose-500/50 bg-rose-950/20 text-rose-300"
                : analysisResult.acoustic_detection.verdict === "Evidencia compatible con voz humana"
                ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-300"
                : "border-amber-500/50 bg-amber-950/20 text-amber-300"
            }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    AASIST Veredicto Acústico
                  </span>
                  <span className="text-[10px] font-mono bg-black/40 px-2 py-0.5 rounded border border-white/10">
                    {analysisResult.acoustic_detection.inference_time_ms} ms
                  </span>
                </div>
                <div className="text-lg font-black">{analysisResult.acoustic_detection.verdict}</div>
                <p className="text-xs mt-2 text-slate-300 leading-snug">
                  {analysisResult.acoustic_detection.technical_interpretation}
                </p>
              </div>

              {/* Technical Score Display (Uncalibrated) */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                <span>Puntaje Bruto (Logit):</span>
                <span className="text-sm font-bold text-white">
                  {analysisResult.acoustic_detection.raw_score > 0 ? `+${analysisResult.acoustic_detection.raw_score.toFixed(3)}` : analysisResult.acoustic_detection.raw_score.toFixed(3)}
                </span>
              </div>
            </div>

            {/* PerTh Watermark Verdict */}
            <div className={`p-5 rounded-xl border flex flex-col justify-between ${
              analysisResult.watermark_detection.detected
                ? "border-purple-500/50 bg-purple-950/20 text-purple-300"
                : "border-slate-800 bg-cyber-850 text-slate-300"
            }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Procedencia PerTh
                  </span>
                  <Fingerprint className="h-4 w-4 text-purple-400" />
                </div>
                <div className="text-lg font-black">
                  {analysisResult.watermark_detection.detected ? "Marca de Agua Detectada" : "Sin Marca PerTh"}
                </div>
                <p className="text-xs mt-2 text-slate-300 leading-snug">
                  {analysisResult.watermark_detection.interpretation}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                <span>Índice Coherente:</span>
                <span className="text-sm font-bold text-white">
                  {analysisResult.watermark_detection.correlation_score.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Scientific Rigor & Limitations Disclaimer */}
            <div className="p-5 rounded-xl border border-slate-800 bg-cyber-850 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold mb-2">
                  <Info className="h-4 w-4" />
                  <span>Rigor Científico y Limitaciones</span>
                </div>
                <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc list-inside leading-snug">
                  {analysisResult.acoustic_detection.limitations.map((lim, idx) => (
                    <li key={idx}>{lim}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-3 text-[10px] text-slate-500 font-mono italic">
                * Las puntuaciones no son probabilidades porcentuales calibradas.
              </div>
            </div>
          </div>

          {/* Forensic Audio & Canvas Spectrogram Visualizer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <WaveformSpectrogram
                visualization={analysisResult.visualization}
                duration={analysisResult.visualization.duration}
              />
            </div>
            <div className="lg:col-span-5">
              <AudioPlayer
                audioUrl={`/api/audio/${analysisResult.filename}`}
                isSynthetic={analysisResult.acoustic_detection.verdict === "Evidencia de síntesis"}
                creatorModel={analysisResult.acoustic_detection.model_name}
                title={`Evidencia Evaluada: ${analysisResult.filename}`}
              />
            </div>
          </div>

          {onEvaluateAudio && (
            <div className="flex flex-col gap-3 rounded-xl border border-cyan-500/25 bg-cyan-950/15 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">¿Qué significa esta evidencia en contexto?</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Combiná el resultado acústico con el contenido y la verificación independiente de identidad.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEvaluateAudio(
                  analysisResult.filename,
                  analysisResult.filename === initialSampleName ? initialTranscript : ""
                )}
                className="flex shrink-0 items-center justify-center space-x-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-black transition hover:bg-cyan-400"
              >
                <Layers className="h-4 w-4" />
                <span>Continuar a la matriz de riesgo</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
