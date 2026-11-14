"use client";

import React, { useState } from "react";
import {
  Activity,
  Layers,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Sparkles
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { ExperimentResult } from "@/lib/types";
import { runBenchmarkExperiment } from "@/lib/api";

interface ExperimentsLabTabProps {
  onExperimentComplete?: (result: ExperimentResult) => void;
}

export const ExperimentsLabTab: React.FC<ExperimentsLabTabProps> = ({ onExperimentComplete }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [experimentResult, setExperimentResult] = useState<ExperimentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRunBenchmark = async () => {
    try {
      setIsRunning(true);
      setErrorMessage(null);
      const res = await runBenchmarkExperiment("scenario_c.wav", "scenario_a.wav");
      setExperimentResult(res);
      onExperimentComplete?.(res);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Activity className="h-4 w-4" />
          <span>Módulo Experimental & Robustez Acústica</span>
        </div>
        <h2 className="text-2xl font-black text-white">Benchmark Comparativo Exploratorio</h2>
        <p className="text-xs text-slate-400 mt-1">
          Compara el baseline acústico de VoiceShield sobre una muestra C declarada humana y una muestra A sintética,
          cada una bajo cuatro transformaciones FFmpeg. No es el modelo upstream AASIST.
        </p>
      </div>

      {/* Control Action Panel */}
      <div className="cyber-panel p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white mb-1">Ejecutar benchmark de sensibilidad a transformaciones</h3>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            Genera ocho variantes a partir de dos grabaciones fuente (C y A). La grabación humana y el consentimiento
            se declaran en el manifiesto local; el sistema no los verifica. Las métricas son exploratorias y no
            representan ocho voces independientes ni rendimiento de campo.
          </p>
        </div>

        <button
          onClick={handleRunBenchmark}
          disabled={isRunning}
          className="flex items-center space-x-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-bold text-black hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 transition shadow-lg shadow-cyan-900/30 shrink-0"
        >
          {isRunning ? (
            <>
              <div className="h-4 w-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
              <span>Procesando FFmpeg y detector experimental...</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              <span>Ejecutar Benchmark Experimental</span>
            </>
          )}
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/20 p-3 text-xs text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* Benchmark Results */}
      {experimentResult && (
        <div className="space-y-6">
          <div className="rounded-lg border border-amber-500/30 bg-amber-950/15 p-4 text-xs text-slate-200">
            <p><strong className="text-white">Motor:</strong> {experimentResult.detector_engine}</p>
            <p className="mt-1"><strong className="text-white">Fuentes:</strong> {experimentResult.dataset_summary}</p>
          </div>
          {/* Top Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="cyber-panel p-4 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">Exactitud en estas variantes</span>
              <div className="text-2xl font-black text-white mt-1">
                {(experimentResult.metrics.accuracy * 100).toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-500">{experimentResult.metrics.total_samples} muestras evaluadas</span>
            </div>

            <div className="cyber-panel p-4 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">F1-Score</span>
              <div className="text-2xl font-black text-cyan-400 mt-1">
                {experimentResult.metrics.f1_score.toFixed(3)}
              </div>
              <span className="text-[10px] text-slate-500">Balance Precisión / Recall</span>
            </div>

            <div className="cyber-panel p-4 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">Falsos positivos sobre C</span>
              <div className="text-2xl font-black text-amber-400 mt-1">
                {(experimentResult.metrics.false_positive_rate * 100).toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-500">C humana declarada marcada como sintética</span>
            </div>

            <div className="cyber-panel p-4 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">EER exploratoria</span>
              <div className="text-2xl font-black text-purple-400 mt-1">
                {experimentResult.metrics.equal_error_rate_estimate !== null
                  ? `${(experimentResult.metrics.equal_error_rate_estimate * 100).toFixed(1)}%`
                  : "N/A"}
              </div>
              <span className="text-[10px] text-slate-500">Aproximación sobre ocho variantes derivadas</span>
            </div>
          </div>

          {/* Confusion Matrix & Conditions Tested */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Confusion Matrix Table */}
            <div className="cyber-panel p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Matriz de Confusión Experimental (Umbral = 0.0)
              </h4>
              <p className="text-[11px] text-slate-400 leading-tight">
                Distingue entre clase positiva (Voz Sintética) y clase negativa (Voz Humana).
              </p>

              <div className="overflow-x-auto pt-2">
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 border border-slate-800 bg-slate-900/80 text-slate-400"></th>
                      <th className="p-2 border border-slate-800 bg-slate-900/80 text-slate-300 font-bold">Predicho: Sintético</th>
                      <th className="p-2 border border-slate-800 bg-slate-900/80 text-slate-300 font-bold">Predicho: Humano</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2.5 border border-slate-800 bg-slate-900/60 font-bold text-slate-300 text-left">
                        Etiqueta de fuente: Sintética
                      </td>
                      <td className="p-2.5 border border-slate-800 bg-emerald-950/30 text-emerald-300 font-mono font-bold text-base">
                        {experimentResult.confusion_matrix.true_positives} (TP)
                      </td>
                      <td className="p-2.5 border border-slate-800 bg-rose-950/30 text-rose-300 font-mono font-bold text-base">
                        {experimentResult.confusion_matrix.false_negatives} (FN)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 border border-slate-800 bg-slate-900/60 font-bold text-slate-300 text-left">
                        Etiqueta de fuente: Humana declarada
                      </td>
                      <td className="p-2.5 border border-slate-800 bg-rose-950/30 text-rose-300 font-mono font-bold text-base">
                        {experimentResult.confusion_matrix.false_positives} (FP)
                      </td>
                      <td className="p-2.5 border border-slate-800 bg-emerald-950/30 text-emerald-300 font-mono font-bold text-base">
                        {experimentResult.confusion_matrix.true_negatives} (TN)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Conditions List */}
              <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">Condiciones Acústicas Aplicadas con FFmpeg:</span>
                <ul className="grid grid-cols-2 gap-1.5 mt-1.5 list-disc list-inside">
                  {experimentResult.metrics.conditions_tested.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* EER / ROC Threshold Curve Chart */}
            <div className="cyber-panel p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Tasas de error por umbral (exploratorio)
              </h4>
              <p className="text-[11px] text-slate-400 leading-tight">
                Compara errores al distinguir el origen de voz declarado en estas variantes; no mide la detección de fraude.
              </p>

              <div className="h-60 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={experimentResult.eer_curve_points}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="threshold" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 1]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0b0f19", borderColor: "#334155", fontSize: "11px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Line
                      type="monotone"
                      dataKey="false_positive_rate"
                      name="FPR (C marcada sintética)"
                      stroke="#ff3b5c"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="false_negative_rate"
                      name="FNR (Sintética marcada como humana)"
                      stroke="#00f0ff"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Academic Evaluation Notes */}
          <div className="cyber-panel p-4 flex items-start space-x-3 text-xs text-slate-300">
            <Info className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-white block font-semibold">Conclusión Metodológica del Experimento:</strong>
              <p className="leading-relaxed">{experimentResult.evaluation_notes}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
