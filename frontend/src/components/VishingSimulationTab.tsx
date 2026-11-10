"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  User,
  Volume2,
  Lock,
  Layers,
  ArrowRight
} from "lucide-react";
import { VishingScenario } from "@/lib/types";
import { fetchScenarios, verifyOutOfBandChannel, getAudioUrl } from "@/lib/api";

interface VishingSimulationTabProps {
  onAnalyzeScenario?: (scenarioCode: string) => void;
}

export const VishingSimulationTab: React.FC<VishingSimulationTabProps> = ({ onAnalyzeScenario }) => {
  const [scenarios, setScenarios] = useState<VishingScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<VishingScenario | null>(null);

  // Call simulator state
  const [callState, setCallState] = useState<"idle" | "ringing" | "connected" | "rejected" | "ended">("idle");
  const [callSeconds, setCallSeconds] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Out of band verification modal
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    fetchScenarios().then((data) => {
      setScenarios(data);
      if (data.length > 0) setSelectedScenario(data[0]);
    }).catch(console.error);
  }, []);

  // Timer while call is connected
  useEffect(() => {
    let interval: any = null;
    if (callState === "connected") {
      interval = setInterval(() => {
        setCallSeconds((s) => s + 1);
      }, 1000);
    } else {
      setCallSeconds(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const selectScenario = (sc: VishingScenario) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setSelectedScenario(sc);
    setCallState("ringing");
    setVerificationResult(null);
  };

  const answerCall = () => {
    setCallState("connected");
    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  };

  const rejectCall = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCallState("rejected");
  };

  const endCall = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCallState("ended");
  };

  const handleAudioEnded = () => {
    setCallState("ended");
  };

  const triggerOutOfBandVerification = async () => {
    if (!selectedScenario) return;
    setIsVerifying(true);
    try {
      const res = await verifyOutOfBandChannel(selectedScenario.code);
      setVerificationResult(res);
    } catch (err: any) {
      alert("Error en verificación: " + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const formatTimer = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Title & Academic Disclaimer Banner */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Phone className="h-4 w-4" />
          <span>Módulo de Simulación de Vishing Controlado</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-white">Simulador de Llamadas Telefónicas Ficticias</h2>
            <p className="text-xs text-slate-400 mt-1">
              Evaluación interactiva de la manipulación psicológica ante 4 escenarios académicos predefinidos.
            </p>
          </div>

          {/* Mandatory Disclaimer */}
          <div className="inline-flex items-center space-x-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs text-amber-300">
            <Lock className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-semibold">SIMULACIÓN FICTICIA — AISLADA DE REDES TELEFÓNICAS</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Scenario Selector vs Phone Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 4 Scenario Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Seleccione un Escenario Académico de Prueba:
          </h3>

          <div className="space-y-3">
            {scenarios.map((sc) => {
              const isSelected = selectedScenario?.code === sc.code;
              return (
                <div
                  key={sc.code}
                  onClick={() => selectScenario(sc)}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? "border-cyan-500 bg-cyber-850 shadow-[0_0_20px_rgba(0,240,255,0.15)]"
                      : "border-slate-800 bg-cyber-900/60 hover:border-slate-700 hover:bg-cyber-850"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-white">{sc.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                          sc.ground_truth_voice === "synthetic"
                            ? "bg-purple-950 text-purple-300 border border-purple-800"
                            : "bg-blue-950 text-blue-300 border border-blue-800"
                        }`}>
                          {sc.ground_truth_voice === "synthetic" ? "Voz Sintética (IA)" : "Voz Biológica"}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                          sc.ground_truth_intent === "malicious"
                            ? "bg-rose-950 text-rose-300 border border-rose-800"
                            : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                        }`}>
                          {sc.ground_truth_intent === "malicious" ? "Ataque Vishing" : "Legítima"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{sc.description}</p>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
                    <div>
                      <strong className="text-slate-300">Emisor Declarado:</strong> {sc.caller_name} ({sc.caller_phone_display})
                    </div>
                    <span className="text-cyan-400 font-semibold">{sc.duration_seconds}s</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pedagogical Note for Selected Scenario */}
          {selectedScenario && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-2">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                Objetivo Pedagógico del Escenario:
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedScenario.pedagogical_objective}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Virtual Phone Screen Simulator (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          {/* Phone Shell */}
          <div className="w-full max-w-sm rounded-[2.5rem] border-4 border-slate-800 bg-black p-4 shadow-2xl relative overflow-hidden">
            {/* Speaker & Sensor Notch */}
            <div className="mx-auto h-4 w-32 rounded-full bg-slate-900 mb-6 flex items-center justify-center space-x-2">
              <div className="h-1.5 w-10 rounded-full bg-slate-800" />
              <div className="h-2 w-2 rounded-full bg-cyan-900" />
            </div>

            {selectedScenario ? (
              <div className="flex flex-col items-center text-center space-y-4 py-2">
                {/* Caller Avatar */}
                <div className={`flex h-20 w-20 items-center justify-center rounded-full border-2 ${
                  callState === "ringing" ? "border-cyan-400 animate-pulse bg-cyan-950/60 text-cyan-300" : "border-slate-700 bg-slate-900 text-slate-300"
                }`}>
                  <User className="h-10 w-10" />
                </div>

                {/* Caller Information */}
                <div>
                  <h4 className="text-base font-bold text-white">{selectedScenario.caller_name}</h4>
                  <p className="text-xs text-slate-400">{selectedScenario.caller_role}</p>
                  <p className="text-[11px] font-mono text-cyan-400 mt-1">{selectedScenario.caller_phone_display}</p>
                </div>

                {/* Call Status Display */}
                <div className="rounded-full bg-slate-900/90 border border-slate-800 px-4 py-1 text-xs">
                  {callState === "ringing" && <span className="text-amber-400 font-semibold animate-pulse">Llamada Entrante...</span>}
                  {callState === "connected" && <span className="text-emerald-400 font-mono font-bold">En Línea — {formatTimer(callSeconds)}</span>}
                  {callState === "rejected" && <span className="text-rose-400 font-semibold">Llamada Rechazada</span>}
                  {callState === "ended" && <span className="text-slate-400 font-semibold">Llamada Finalizada</span>}
                  {callState === "idle" && <span className="text-slate-500 font-semibold">Esperando</span>}
                </div>

                {/* Live Transcript Snippet during Call */}
                <div className="w-full rounded-xl bg-slate-950 border border-slate-800/80 p-3 text-left">
                  <div className="flex items-center space-x-1.5 text-[10px] text-cyan-400 font-bold uppercase mb-1">
                    <Volume2 className="h-3 w-3" />
                    <span>Audio del Interlocutor (Transcripción):</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug italic max-h-24 overflow-y-auto font-mono">
                    "{selectedScenario.transcript}"
                  </p>
                </div>

                {/* Hidden Audio Element */}
                <audio
                  ref={audioRef}
                  src={getAudioUrl(selectedScenario.audio_url)}
                  onEnded={handleAudioEnded}
                />

                {/* Interactive Phone Call Buttons */}
                <div className="w-full pt-2 grid grid-cols-2 gap-3">
                  {callState === "ringing" ? (
                    <>
                      <button
                        onClick={rejectCall}
                        className="flex items-center justify-center space-x-2 rounded-xl bg-rose-600 py-3 text-xs font-bold text-white shadow-lg shadow-rose-950 hover:bg-rose-500 transition"
                      >
                        <PhoneOff className="h-4 w-4" />
                        <span>Rechazar</span>
                      </button>
                      <button
                        onClick={answerCall}
                        className="flex items-center justify-center space-x-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-950 hover:bg-emerald-500 transition animate-bounce"
                      >
                        <PhoneCall className="h-4 w-4" />
                        <span>Aceptar</span>
                      </button>
                    </>
                  ) : callState === "connected" ? (
                    <button
                      onClick={endCall}
                      className="col-span-2 flex items-center justify-center space-x-2 rounded-xl bg-rose-600 py-3 text-xs font-bold text-white shadow-lg shadow-rose-950 hover:bg-rose-500 transition"
                    >
                      <PhoneOff className="h-4 w-4" />
                      <span>Cortar Comunicación</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setCallState("ringing")}
                      className="col-span-2 flex items-center justify-center space-x-2 rounded-xl bg-cyan-600 py-3 text-xs font-bold text-white hover:bg-cyan-500 transition"
                    >
                      <PhoneCall className="h-4 w-4" />
                      <span>Reiniciar Llamada Simulada</span>
                    </button>
                  )}
                </div>

                {/* Out-of-Band Verification Control (Dimensión D) */}
                <button
                  onClick={triggerOutOfBandVerification}
                  disabled={isVerifying}
                  className="w-full flex items-center justify-center space-x-2 rounded-xl border border-cyan-500/40 bg-cyan-950/40 py-2.5 text-xs font-bold text-cyan-300 hover:bg-cyan-900/40 transition"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{isVerifying ? "Marcando a conmutador corporativo..." : "Verificar por Canal Fuera de Banda"}</span>
                </button>
              </div>
            ) : null}
          </div>

          {/* Out of Band Verification Result Dialog */}
          {verificationResult && (
            <div className={`mt-4 w-full max-w-sm rounded-xl border p-4 text-xs space-y-2 ${
              verificationResult.verified
                ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-200"
                : "border-rose-500/40 bg-rose-950/20 text-rose-200"
            }`}>
              <div className="flex items-center space-x-2 font-bold">
                {verificationResult.verified ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                )}
                <span>Canal: {verificationResult.channel}</span>
              </div>
              <p className="text-[11px] leading-relaxed">{verificationResult.message}</p>
              <div className="font-semibold text-[10px] text-white pt-1">
                Acción recomendada: {verificationResult.protocol_action}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
