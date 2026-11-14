"use client";

import React from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Lock,
  Trash2,
  CheckCircle2,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { purgeLabData } from "@/lib/api";

interface ConclusionsTabProps {
  onDataPurged: () => void;
  localOperationBusy: boolean;
}

export const ConclusionsTab: React.FC<ConclusionsTabProps> = ({ onDataPurged, localOperationBusy }) => {
  const handlePurge = async () => {
    if (localOperationBusy) return;
    if (confirm("¿Eliminar cargas, clones de esta sesión, derivados experimentales, grabaciones C/D registradas y metadatos locales?")) {
      try {
        const res = await purgeLabData();
        onDataPurged();
        alert([res.message, res.scope_note].filter(Boolean).join("\n\n"));
      } catch (err: any) {
        alert("Error al purgar datos: " + err.message);
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Module Title */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
          <ShieldCheck className="h-4 w-4" />
          <span>Conclusiones Académicas y Protocolo Operativo</span>
        </div>
        <h2 className="text-2xl font-black text-white">Guía de Prevención y Hallazgos del Laboratorio</h2>
        <p className="text-xs text-slate-400 mt-1">
          Síntesis para la defensa universitaria: limitaciones de la detección por IA y lineamientos defensivos.
        </p>
      </div>

      {/* Core Academic Conclusions Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="cyber-panel p-5 border-amber-500/20">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-400 mb-3">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1.5">1. La Acústica No es Suficiente</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            El benchmark mide cómo responde el detector experimental de VoiceShield a las condiciones que ejecutaste.
            Compará los valores observados: una sola muestra fuente por clase no alcanza para generalizar ni afirmar
            una tasa de error de campo.
          </p>
        </div>

        <div className="cyber-panel p-5 border-cyan-500/20">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 mb-3">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1.5">2. El Factor Humano Prevalece</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            El guion D permite estudiar pedidos sensibles con una voz humana si se aporta una grabación consentida.
            Las mismas señales de manipulación pueden aparecer en una voz sintética; el timbre no define la intención.
          </p>
        </div>

        <div className="cyber-panel p-5 border-emerald-500/20">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 mb-3">
            <Lock className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1.5">3. Verificación Fuera de Banda</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Ante una solicitud sensible, pausá la acción y verificá por un canal independiente conocido. Es un control
            operativo recomendado; el laboratorio no demuestra que exista una defensa técnica infalible.
          </p>
        </div>
      </div>

      {/* Corporate Action Protocol */}
      <div className="cyber-panel p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <FileText className="h-5 w-5 text-cyan-400" />
          <span>Protocolo Operativo de Respuesta ante Sospecha de Vishing (SOP)</span>
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex items-start space-x-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 font-mono font-bold text-cyan-400">
              1
            </span>
            <div>
              <strong className="text-white block">Pausar e Identificar Disparadores Emocionales:</strong>
              <p className="text-slate-300 mt-0.5">
                Reconocer invocaciones de urgencia extrema ("ya mismo"), presión jerárquica superior o peticiones
                de secretismo ("no le comentes a nadie").
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 font-mono font-bold text-cyan-400">
              2
            </span>
            <div>
              <strong className="text-white block">No Proporcionar Datos Críticos bajo Llamada Entrante:</strong>
              <p className="text-slate-300 mt-0.5">
                Bajo ninguna circunstancia suministrar contraseñas, códigos OTP de doble factor, tokens ni autorizar
                transferencias bancarias fuera de los sistemas formales de la organización.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 font-mono font-bold text-cyan-400">
              3
            </span>
            <div>
              <strong className="text-white block">Ejecutar la Verificación Out-of-Band (Llamada Inversa):</strong>
              <p className="text-slate-300 mt-0.5">
                Interrumpir la comunicación telefónica y contactar al supuesto emisor marcando al número oficial
                registrado en el directorio corporativo o mediante la mesa de ayuda institucional.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 font-mono font-bold text-cyan-400">
              4
            </span>
            <div>
              <strong className="text-white block">Reporte Inmediato al SOC / CSIRT:</strong>
              <p className="text-slate-300 mt-0.5">
                Documentar hora, número identificador y pretexto utilizado para alertar a toda la organización
                contra campañas coordinadas de suplantación de directivos (CEO Fraud).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Academic Privacy Data Purge Section */}
      <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center space-x-2">
            <Trash2 className="h-4 w-4 text-rose-400" />
            <span>Saneamiento Ético de Datos del Laboratorio</span>
          </h4>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Elimina cargas, clones generados, variantes experimentales, grabaciones humanas C/D registradas y metadatos
            locales. Conserva A/B sintéticas, pesos de modelos y JSON ya descargados; el borrado de archivos no es forense.
          </p>
        </div>

        <button
          onClick={handlePurge}
          disabled={localOperationBusy}
          className="flex items-center space-x-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          <span>Limpiar Datos de Sesión</span>
        </button>
      </div>
    </div>
  );
};
