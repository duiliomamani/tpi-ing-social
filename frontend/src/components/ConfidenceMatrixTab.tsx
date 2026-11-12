"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Brain,
  Quote,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Layers,
  PhoneCall,
  Lock,
  Sparkles
} from "lucide-react";
import {
  MultilayerRiskAssessmentResponse,
  SocialEngineeringAnalysisResponse,
  LabAudioSample
} from "@/lib/types";
import {
  evaluateComprehensiveRisk,
  fetchLabSamples
} from "@/lib/api";

interface ConfidenceMatrixTabProps {
  initialSampleName?: string | null;
  initialTranscript?: string;
}

const REFERENCE_SAMPLE_NAMES = ["scenario_a.wav", "scenario_b.wav", "scenario_c.wav", "scenario_d.wav"];

export const ConfidenceMatrixTab: React.FC<ConfidenceMatrixTabProps> = ({
  initialSampleName,
  initialTranscript = ""
}) => {
  const [samples, setSamples] = useState<LabAudioSample[]>([]);
  const [selectedSample, setSelectedSample] = useState<string>(initialSampleName || "scenario_a.wav");
  const [verifiedIdentity, setVerifiedIdentity] = useState<boolean>(false);
  const [customTranscript, setCustomTranscript] = useState<string>(initialTranscript);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [riskAssessment, setRiskAssessment] = useState<MultilayerRiskAssessmentResponse | null>(null);
  const [socialAnalysis, setSocialAnalysis] = useState<SocialEngineeringAnalysisResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchLabSamples().then(setSamples).catch(console.error);
  }, []);

  const clearEvaluation = () => {
    setRiskAssessment(null);
    setSocialAnalysis(null);
    setErrorMessage(null);
  };

  const handleEvaluate = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setRiskAssessment(null);
      setSocialAnalysis(null);

      // 1. Comprehensive Multilayer Risk
      const riskRes = await evaluateComprehensiveRisk(
        selectedSample,
        verifiedIdentity,
        customTranscript.trim() || undefined
      );
      setRiskAssessment(riskRes);
      setSocialAnalysis(riskRes.social_analysis || null);
      if (!customTranscript.trim() && riskRes.social_analysis?.transcript) {
        setCustomTranscript(riskRes.social_analysis.transcript);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Layers className="h-4 w-4" />
          <span>Matriz de Confianza Multicapa & Análisis Semántico Gemma 3</span>
        </div>
        <h2 className="text-2xl font-black text-white">Evaluación Multidimensional de Factores de Riesgo</h2>
        <p className="text-xs text-slate-400 mt-1">
          Integración de 4 dimensiones: evidencia acústica, marca de procedencia, contenido de la comunicación
          y verificación de identidad fuera de banda.
        </p>
      </div>

      {/* Control Panel: Select Audio, Out-of-band Toggle, Transcript */}
      <div className="cyber-panel p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sample Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Muestra de Comunicación a Evaluar:
            </label>
            <select
              value={selectedSample}
              onChange={(e) => {
                setSelectedSample(e.target.value);
                const sample = samples.find((item) => item.audio_file === e.target.value);
                if (sample) setCustomTranscript(sample.transcript);
                else setCustomTranscript(e.target.value === initialSampleName ? initialTranscript : "");
                clearEvaluation();
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
            >
              {initialSampleName && !REFERENCE_SAMPLE_NAMES.includes(initialSampleName) && (
                <option value={initialSampleName}>Audio analizado en esta sesión</option>
              )}
              <option value="scenario_a.wav">Muestra A — Suplantación Directiva (Martín Silva)</option>
              <option value="scenario_b.wav">Muestra B — Urgencia Emocional (Lucas Morales)</option>
              <option value="scenario_c.wav">Muestra C — Coordinación Laboral (Sofía Benítez)</option>
              <option value="scenario_d.wav">Muestra D — Solicitud de OTP con voz humana</option>
            </select>
          </div>

          {/* Out-of-Band Verification Toggle (Dimensión D) */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <Lock className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Dimensión D: Verificación Fuera de Banda</span>
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                  verifiedIdentity ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                }`}>
                  {verifiedIdentity ? "VERIFICADO" : "NO VERIFICADO"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                ¿Se confirmó la identidad y solicitud llamando al número oficial corporativo preestablecido?
              </p>
            </div>

            <label className="flex items-center space-x-2.5 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={verifiedIdentity}
                onChange={(e) => {
                  setVerifiedIdentity(e.target.checked);
                  clearEvaluation();
                }}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-cyan-500"
              />
              <span className="text-xs text-slate-300 font-medium">
                Identidad confirmada por canal alternativo independiente
              </span>
            </label>
          </div>

          {/* Action Button */}
          <div className="flex flex-col justify-end">
            <button
              onClick={handleEvaluate}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-xs font-bold text-black hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 transition shadow-lg shadow-cyan-900/30"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  <span>Evaluando las 4 Dimensiones...</span>
                </>
              ) : (
                <>
                  <Layers className="h-4 w-4" />
                  <span>Evaluar Matriz de Confianza</span>
                </>
              )}
            </button>
          </div>
        </div>

        {initialSampleName && !REFERENCE_SAMPLE_NAMES.includes(initialSampleName) && selectedSample === initialSampleName && (
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-3 text-xs text-cyan-100">
            Se evaluará <strong>{initialSampleName}</strong>. El texto de la sesión se carga como contexto semántico y podés editarlo antes de ejecutar la matriz.
          </div>
        )}

        {/* Transcript editor */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Transcripción para el análisis semántico (revisala antes de evaluar):
          </label>
          <textarea
            rows={2}
            value={customTranscript}
            onChange={(e) => {
              setCustomTranscript(e.target.value);
              clearEvaluation();
            }}
            placeholder="Texto transcripto de la comunicación para análisis semántico con Gemma 3 4B..."
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none font-mono"
          />
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/20 p-3 text-xs text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* Multilayer Evaluation Results */}
      {riskAssessment && (
        <div className="space-y-6">
          {/* Main Operational Recommendation Banner */}
          <div className={`p-6 rounded-2xl border-2 shadow-2xl ${
            riskAssessment.operational_risk_level === "CRITICO"
              ? "border-rose-500 bg-rose-950/30 text-rose-200 shadow-rose-950/50"
              : riskAssessment.operational_risk_level === "ALTO"
              ? "border-amber-500 bg-amber-950/30 text-amber-200 shadow-amber-950/50"
              : riskAssessment.operational_risk_level === "MEDIO"
              ? "border-yellow-500 bg-yellow-950/30 text-yellow-200 shadow-yellow-950/50"
              : "border-emerald-500 bg-emerald-950/30 text-emerald-200 shadow-emerald-950/50"
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-black text-lg ${
                  riskAssessment.operational_risk_level === "CRITICO"
                    ? "bg-rose-500 text-black animate-pulse"
                    : riskAssessment.operational_risk_level === "ALTO"
                    ? "bg-amber-400 text-black"
                    : riskAssessment.operational_risk_level === "MEDIO"
                    ? "bg-yellow-400 text-black"
                    : "bg-emerald-400 text-black"
                }`}>
                  {riskAssessment.operational_risk_level}
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Recomendación Operativa del Laboratorio
                  </span>
                  <h3 className="text-lg font-black text-white">{riskAssessment.operational_recommendation}</h3>
                </div>
              </div>

              {/* Applied Rule Tag */}
              <div className="rounded-lg bg-black/50 border border-white/15 px-3 py-1.5 text-right">
                <span className="text-[10px] font-mono text-slate-400 block">Regla de Decisión Activa:</span>
                <span className="text-xs font-bold text-cyan-300 font-mono">{riskAssessment.applied_rule}</span>
              </div>
            </div>

            {/* Action Protocol Steps */}
            <div>
              <span className="text-xs font-bold text-white block mb-2">Protocolo de Acción Recomendado:</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {riskAssessment.action_protocol.map((step, idx) => (
                  <div key={idx} className="flex items-center space-x-2 rounded-lg bg-black/40 px-3 py-2 border border-white/5">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                    <span className="text-slate-300">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4 Dimension Evidence Cards */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              <span>Evidencia Desglosada por Dimensión Operativa</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {riskAssessment.dimensions.map((dim) => {
                const isCrit = dim.risk_contribution === "critico";
                const isHigh = dim.risk_contribution === "alto";
                const isLow = dim.risk_contribution === "bajo";
                return (
                  <div
                    key={dim.dimension_code}
                    className="cyber-panel p-4 flex flex-col justify-between border-slate-800"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                          {dim.dimension_code.replace("_", " ")}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                          isCrit ? "bg-rose-950 text-rose-300 border border-rose-800" :
                          isHigh ? "bg-amber-950 text-amber-300 border border-amber-800" :
                          isLow ? "bg-emerald-950 text-emerald-300 border border-emerald-800" :
                          "bg-slate-900 text-slate-400 border border-slate-700"
                        }`}>
                          {dim.risk_contribution}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white mb-1">{dim.dimension_name}</div>
                      <p className="text-[11px] text-slate-300 leading-snug">{dim.indicator_summary}</p>
                    </div>

                    <p className="text-[10px] text-slate-500 border-t border-slate-800/80 pt-2 mt-3 italic">
                      {dim.technical_detail}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gemma 3 4B — 8 Social Engineering Factors Table */}
          {socialAnalysis && (
            <div className="cyber-panel p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-cyan-400" />
                  <span className="text-sm font-bold text-white">
                    Análisis Semántico de Manipulación Psicológica — Gemma 3 4B
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-400">Riesgo Semántico:</span>
                  <span className="font-mono font-bold text-cyan-300">
                    {socialAnalysis.semantic_risk_score.toFixed(1)}/100 ({socialAnalysis.semantic_risk_level})
                  </span>
                  <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-400 border border-slate-800">
                    {socialAnalysis.analyzer_engine}
                  </span>
                </div>
              </div>

              {/* Factors Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {socialAnalysis.factors.map((f) => {
                  const isDetected = f.estado === "detectado";
                  return (
                    <div
                      key={f.factor_id}
                      className={`p-3 rounded-lg border text-xs transition ${
                        isDetected
                          ? "border-amber-500/40 bg-amber-950/15"
                          : "border-slate-800/80 bg-slate-950/40 opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-white flex items-center space-x-1.5">
                          {isDetected ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          )}
                          <span>{f.factor_name}</span>
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                          isDetected ? "bg-amber-400 text-black" : "bg-slate-800 text-slate-400"
                        }`}>
                          {f.estado}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-snug">{f.explicacion}</p>

                      {f.fragmento_cita && (
                        <div className="mt-2 rounded bg-black/40 border border-white/5 p-2 text-[10px] text-cyan-300/90 font-mono italic">
                          <Quote className="h-2.5 w-2.5 inline mr-1 text-cyan-400" />
                          "{f.fragmento_cita}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Untrusted Data Defense Banner */}
              <div className="rounded-lg bg-black/40 border border-slate-800 p-2.5 text-[10px] text-slate-500 flex items-center space-x-2">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>
                  Protección activa contra inyecciones de prompt: el contenido transcripto fue analizado exclusivamente como evidencia de texto no confiable, sin ejecutar instrucciones incrustadas.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
