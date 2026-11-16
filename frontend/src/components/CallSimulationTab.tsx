"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleStop,
  Headphones,
  LoaderCircle,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Radio,
  ShieldCheck,
  ShieldX,
  Upload,
  Volume2,
} from "lucide-react";
import {
  callSimulationWebSocketUrl,
  fetchCallSimulationStatus,
  transcribeVoiceReference,
  uploadVoiceReference,
} from "@/lib/api";
import type { CallSimulationStatus, SocialEngineeringAnalysisResponse } from "@/lib/types";

const RoomCanvas = dynamic(
  () => import("@/components/CallRoom3D").then((module) => module.CallRoom3D),
  { ssr: false, loading: () => <div className="h-full min-h-[320px] animate-pulse rounded-2xl bg-slate-900" /> },
);

type CallPhase = "idle" | "connecting" | "processing" | "speaking" | "listening" | "finished" | "error";
type Turn = { id: string; speaker: "caller" | "participant"; text: string };

const DEFAULT_SCENARIO_PROMPT =
  "Quien llama se presenta como el CEO de la empresa ficticia MerchPay, dice que ganaste un sorteo y solicita una transferencia para liberar el premio. La práctica busca reconocer autoridad no verificada, un premio inesperado y un pedido de dinero, y verificarlo por un canal oficial.";
const MAX_SCENARIO_PROMPT_CHARS = 600;

interface CallSimulationResult {
  scenario: string;
  models: { llm: string; tts: string };
  outcome: string;
  outcome_message?: string;
  defensive_action?: string | null;
  caller_transcript: string;
  participant_transcript: string;
  risk_analysis?: SocialEngineeringAnalysisResponse;
}

interface CallSimulationTabProps {
  isActive: boolean;
  onBusyChange: (busy: boolean) => void;
  onComplete: (result: CallSimulationResult) => void;
}

function apiRoot() {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/+$/, "");
}

function base64FromBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    const chunk = bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return window.btoa(binary);
}

function VoiceBars({ active }: { active: boolean }) {
  return (
    <div className={`flex h-8 items-center gap-1 ${active ? "text-cyan-300" : "text-slate-700"}`} aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((bar, index) => (
        <span
          key={bar}
          className={`w-1 rounded-full ${active ? "animate-pulse bg-current" : "bg-current"}`}
          style={{ height: active ? `${9 + ((index * 11) % 19)}px` : "5px", animationDelay: `${index * 45}ms` }}
        />
      ))}
    </div>
  );
}

export function CallSimulationTab({ isActive, onBusyChange, onComplete }: CallSimulationTabProps) {
  const [status, setStatus] = useState<CallSimulationStatus | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceDuration, setSourceDuration] = useState<number | null>(null);
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(10);
  const [consent, setConsent] = useState(false);
  const [voiceReferenceId, setVoiceReferenceId] = useState("");
  const [referenceTranscript, setReferenceTranscript] = useState("");
  const [referenceDuration, setReferenceDuration] = useState<number | null>(null);
  const [referenceUrl, setReferenceUrl] = useState("");
  const [scenarioPrompt, setScenarioPrompt] = useState(DEFAULT_SCENARIO_PROMPT);
  const [preparingVoice, setPreparingVoice] = useState(false);
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [voiceFallback, setVoiceFallback] = useState(false);
  const [result, setResult] = useState<CallSimulationResult | null>(null);
  const [callerSpeaking, setCallerSpeaking] = useState(false);
  const [participantSpeaking, setParticipantSpeaking] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSampleRateRef = useRef(24000);
  const nextAudioTimeRef = useRef(0);
  const callerTextRef = useRef("");
  const finalCallerLineRef = useRef(false);
  const discardRecordingRef = useRef(false);
  const audioEndTimerRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const turnSequenceRef = useRef(0);
  const sourceUrlRef = useRef("");

  useEffect(() => {
    if (!isActive) {
      if (recorderRef.current?.state === "recording") {
        discardRecordingRef.current = true;
        recorderRef.current.stop();
      }
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "finish" }));
        setPhase("processing");
      } else {
        socket?.close(1000, "Se cerró la pestaña antes de conectar");
        socketRef.current = null;
        onBusyChange(false);
      }
      return;
    }
    const refreshStatus = () => fetchCallSimulationStatus().then(setStatus).catch(() => setStatus(null));
    refreshStatus();
    const timer = window.setInterval(refreshStatus, 10000);
    return () => window.clearInterval(timer);
  }, [isActive, onBusyChange]);

  useEffect(() => () => {
    socketRef.current?.close(1000, "Se cerró la sala");
    onBusyChange(false);
    if (recorderRef.current?.state === "recording") {
      discardRecordingRef.current = true;
      recorderRef.current.stop();
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (recordingTimerRef.current) window.clearTimeout(recordingTimerRef.current);
    if (audioEndTimerRef.current) window.clearTimeout(audioEndTimerRef.current);
    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
    window.speechSynthesis?.cancel();
    void audioContextRef.current?.close();
  }, [onBusyChange]);

  const appendTurn = (speaker: Turn["speaker"], text: string) => {
    turnSequenceRef.current += 1;
    setTurns((current) => [...current, { id: `turn-${turnSequenceRef.current}`, speaker, text }]);
  };

  const speakWithDeviceVoice = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-AR";
    const spanishVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("es"));
    if (spanishVoice) utterance.voice = spanishVoice;
    utterance.onstart = () => setCallerSpeaking(true);
    utterance.onend = () => {
      setCallerSpeaking(false);
      setPhase((current) => current === "finished" ? current : finalCallerLineRef.current ? "processing" : "listening");
    };
    window.speechSynthesis.speak(utterance);
  };

  const playAudioChunk = (encoded: string) => {
    const context = audioContextRef.current;
    if (!context || !encoded) return;
    const binary = window.atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const samples = new Float32Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 4));
    if (samples.length === 0) return;
    const buffer = context.createBuffer(1, samples.length, currentSampleRateRef.current);
    buffer.copyToChannel(samples, 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    const startAt = Math.max(context.currentTime + 0.045, nextAudioTimeRef.current);
    source.start(startAt);
    nextAudioTimeRef.current = startAt + buffer.duration;
    setCallerSpeaking(true);
  };

  const sendToSocket = (message: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError("La conexión local de la llamada se cerró. Volvé a iniciar la simulación.");
      return false;
    }
    socket.send(JSON.stringify(message));
    return true;
  };

  const handleSocketMessage = (message: Record<string, any>) => {
    switch (message.type) {
      case "session_started":
        setPhase("processing");
        setError("");
        break;
      case "caller_text":
        callerTextRef.current = String(message.text || "");
        finalCallerLineRef.current = Boolean(message.final);
        appendTurn("caller", callerTextRef.current);
        setPhase("speaking");
        break;
      case "participant_text":
        appendTurn("participant", String(message.text || ""));
        setParticipantSpeaking(false);
        setPhase("processing");
        break;
      case "audio_start":
        currentSampleRateRef.current = Number(message.sample_rate || 24000);
        nextAudioTimeRef.current = audioContextRef.current?.currentTime || 0;
        break;
      case "audio_chunk":
        currentSampleRateRef.current = Number(message.sample_rate || currentSampleRateRef.current);
        playAudioChunk(String(message.audio_base64 || ""));
        break;
      case "audio_done": {
        const context = audioContextRef.current;
        const remainingMs = context
          ? Math.max(0, (nextAudioTimeRef.current - context.currentTime) * 1000) + 80
          : 0;
        if (audioEndTimerRef.current) window.clearTimeout(audioEndTimerRef.current);
        audioEndTimerRef.current = window.setTimeout(() => {
          setCallerSpeaking(false);
          setPhase((current) => current === "finished" || current === "processing" || finalCallerLineRef.current ? "processing" : "listening");
        }, remainingMs);
        break;
      }
      case "audio_error":
        setVoiceFallback(true);
        setError(`${String(message.message || "Qwen3-TTS no respondió.")} Se usa la voz española del dispositivo para esta respuesta.`);
        speakWithDeviceVoice(callerTextRef.current);
        break;
      case "input_error":
      case "error":
        setError(String(message.message || "Ocurrió un error en la sala."));
        if (message.type === "error") setPhase("error");
        break;
      case "session_ended": {
        const completed: CallSimulationResult = {
          scenario: String(message.scenario || "personalizado_ficticio"),
          models: message.models || { llm: status?.llm_model || "qwen3.5:2b", tts: status?.tts_model || "qwen3-tts" },
          outcome: String(message.outcome || "practica_finalizada"),
          outcome_message: String(message.outcome_message || ""),
          defensive_action: message.defensive_action || null,
          caller_transcript: String(message.caller_transcript || ""),
          participant_transcript: String(message.participant_transcript || ""),
          risk_analysis: message.risk_analysis,
        };
        setResult(completed);
        finalCallerLineRef.current = false;
        setPhase("finished");
        setCallerSpeaking(false);
        onComplete(completed);
        socketRef.current?.close(1000, "Simulación finalizada");
        socketRef.current = null;
        break;
      }
      default:
        break;
    }
  };

  const prepareVoice = async () => {
    if (!selectedFile || !consent) return;
    const useManualClip = sourceDuration !== null && sourceDuration > 12;
    if (useManualClip && (
      clipStart < 0 || clipEnd > sourceDuration || clipEnd - clipStart < 5 || clipEnd - clipStart > 12
    )) {
      setError("Elegí un tramo dentro de la grabación que dure entre 5 y 12 segundos.");
      return;
    }
    setPreparingVoice(true);
    onBusyChange(true);
    setError("");
    setVoiceReferenceId("");
    setReferenceTranscript("");
    setReferenceDuration(null);
    setReferenceUrl("");
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      form.append("consent_granted", "true");
      const upload = await uploadVoiceReference(form) as { reference_id: string };
      const prepared = await transcribeVoiceReference(
        upload.reference_id,
        true,
        useManualClip ? clipStart : undefined,
        useManualClip ? clipEnd : undefined,
      );
      setVoiceReferenceId(prepared.reference_audio_id);
      setReferenceTranscript(prepared.reference_transcript);
      setReferenceDuration(prepared.duration_seconds);
      setReferenceUrl(`${apiRoot()}/audio/${encodeURIComponent(prepared.reference_audio_id)}.wav`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo preparar la referencia de voz.");
    } finally {
      setPreparingVoice(false);
      onBusyChange(false);
    }
  };

  const startCall = async () => {
    if (!voiceReferenceId || !referenceTranscript.trim() || !consent || !scenarioPrompt.trim()) return;
    setError("");
    setTurns([]);
    setResult(null);
    turnSequenceRef.current = 0;
    finalCallerLineRef.current = false;
    setVoiceFallback(false);
    setPhase("connecting");
    onBusyChange(true);
    try {
      socketRef.current?.close(1000, "Nueva simulación");
      await audioContextRef.current?.close();
      const context = new AudioContext();
      audioContextRef.current = context;
      await context.resume();
      const socket = new WebSocket(callSimulationWebSocketUrl());
      socketRef.current = socket;
      socket.onopen = () => socket.send(JSON.stringify({
        type: "start",
        reference_audio_id: voiceReferenceId,
        reference_transcript: referenceTranscript.trim(),
        scenario_prompt: scenarioPrompt.trim(),
        consent_granted: consent,
      }));
      socket.onmessage = (event) => {
        if (typeof event.data !== "string") return;
        try {
          handleSocketMessage(JSON.parse(event.data));
        } catch {
          setError("El servidor local devolvió una respuesta que no pude interpretar.");
        }
      };
      socket.onerror = () => {
        setError("No se pudo conectar con el servidor local de simulación.");
        setPhase("error");
        onBusyChange(false);
      };
      socket.onclose = () => {
        if (phase !== "finished") setCallerSpeaking(false);
        onBusyChange(false);
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar el audio de la sala.");
      setPhase("error");
      socketRef.current?.close(1011, "No se pudo iniciar la sala");
      socketRef.current = null;
      void audioContextRef.current?.close();
      audioContextRef.current = null;
      onBusyChange(false);
    }
  };

  const submitText = () => {
    const text = draft.trim().slice(0, 600);
    if (!text || phase !== "listening") return;
    setDraft("");
    setPhase("processing");
    sendToSocket({ type: "user_text", text });
  };

  const submitAction = (action: "verify" | "refuse" | "report") => {
    if (phase !== "listening") return;
    setPhase("processing");
    sendToSocket({ type: "action", action });
  };

  const startRecording = async () => {
    if (phase !== "listening" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Este navegador no ofrece grabación de micrófono. Podés responder por texto.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const preferredMime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      const recorder = preferredMime ? new MediaRecorder(stream, { mimeType: preferredMime }) : new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = async () => {
        setRecording(false);
        setParticipantSpeaking(false);
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        if (discardRecordingRef.current) {
          discardRecordingRef.current = false;
          return;
        }
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (!blob.size) return;
        setPhase("processing");
        try {
          const encoded = base64FromBuffer(await blob.arrayBuffer());
          sendToSocket({ type: "user_audio", mime_type: blob.type, audio_base64: encoded });
        } catch {
          setError("No se pudo preparar la respuesta de voz para la transcripción local.");
          setPhase("listening");
        }
      };
      recorder.start(200);
      discardRecordingRef.current = false;
      setRecording(true);
      setParticipantSpeaking(true);
      recordingTimerRef.current = window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 8000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo acceder al micrófono.");
    }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) window.clearTimeout(recordingTimerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const hangUp = () => {
    if (recording) {
      discardRecordingRef.current = true;
      stopRecording();
    }
    setPhase("processing");
    sendToSocket({ type: "finish" });
  };

  const activeCall = ["connecting", "processing", "speaking", "listening"].includes(phase);
  const canStart = Boolean(voiceReferenceId && referenceTranscript.trim() && scenarioPrompt.trim() && consent && !preparingVoice && !activeCall);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-cyan-900/50 bg-[radial-gradient(ellipse_at_top_left,_rgba(8,145,178,0.15),_transparent_48%),linear-gradient(145deg,#0b1422,#070b12_72%)] p-6 shadow-2xl shadow-black/40 md:p-8">
        <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">
              <Radio className="h-3.5 w-3.5" /> Sala local · simulación interactiva
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">Llamada simulada en vivo</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
              Un emisor ficticio habla con una voz generada desde una muestra autorizada. Respondé por micrófono o texto; al cerrar, revisamos el diálogo y las señales de riesgo.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <ModelChip label="Diálogo" value={status?.llm_model || "Qwen3.5:2B"} available={status?.llm_available ?? false} />
            <ModelChip label="Voz" value="Qwen3-TTS · 0.6B" available={status?.tts_available ?? false} />
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-2 text-[11px] text-slate-400">
          <span className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1.5">Solo localhost</span>
          <span className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1.5">Sin llamadas telefónicas</span>
          <span className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1.5">No uses códigos ni datos reales</span>
        </div>
        {status && (!status.llm_available || !status.tts_available) && (
          <div className="relative mt-4 grid gap-2 sm:grid-cols-2" role="status">
            {!status.llm_available && <p className="rounded-xl border border-amber-800/40 bg-amber-950/25 px-3 py-2 text-[10px] leading-4 text-amber-200">{status.llm_message} Instalá Qwen3.5:2B con <code>ollama pull qwen3.5:2b</code>.</p>}
            {!status.tts_available && <p className="rounded-xl border border-amber-800/40 bg-amber-950/25 px-3 py-2 text-[10px] leading-4 text-amber-200">{status.tts_message}</p>}
          </div>
        )}
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(350px,0.8fr)]">
        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/80 shadow-xl shadow-black/20">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">Sala de práctica</p>
              <h2 className="mt-1 text-lg font-bold text-white">Escenario de capacitación</h2>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${activeCall ? "border-rose-500/30 bg-rose-950/30 text-rose-300" : phase === "finished" ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-300" : "border-slate-700 bg-slate-900 text-slate-400"}`}>
              <span className={`h-2 w-2 rounded-full ${activeCall ? "animate-pulse bg-rose-400" : phase === "finished" ? "bg-emerald-400" : "bg-slate-600"}`} />
              {phase === "connecting" ? "Conectando sala" : phase === "processing" ? "Preparando turno" : phase === "speaking" ? "Emisor hablando" : phase === "listening" ? "Tu turno" : phase === "finished" ? "Llamada finalizada" : phase === "error" ? "Interrumpida" : "En espera"}
            </div>
          </div>

          <div className="relative h-[320px] overflow-hidden bg-[#07111d] sm:h-[390px]">
            <RoomCanvas callerSpeaking={callerSpeaking} participantSpeaking={participantSpeaking} />
            <div className="pointer-events-none absolute inset-x-4 top-4 flex justify-between gap-3">
              <div className={`rounded-xl border px-3 py-2 backdrop-blur-md ${callerSpeaking ? "border-cyan-400/50 bg-cyan-950/80" : "border-slate-700/70 bg-slate-950/70"}`}>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-300">Emisor simulado</p>
                <p className="mt-0.5 text-xs font-semibold text-white">Interlocutor ficticio</p>
              </div>
              <div className={`rounded-xl border px-3 py-2 text-right backdrop-blur-md ${participantSpeaking ? "border-blue-400/50 bg-blue-950/80" : "border-slate-700/70 bg-slate-950/70"}`}>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-blue-300">Participante</p>
                <p className="mt-0.5 text-xs font-semibold text-white">Vos</p>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-center justify-between gap-4 rounded-2xl border border-slate-700/70 bg-slate-950/80 px-4 py-3 backdrop-blur-md">
              <div className="flex min-w-0 items-center gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${callerSpeaking ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-800 text-slate-400"}`}>
                  <Volume2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white">{callerSpeaking ? "Voz sintética en reproducción" : activeCall ? "Canal de audio listo" : "La llamada todavía no empezó"}</p>
                  <p className="truncate text-[10px] text-slate-400">{voiceFallback ? "Voz española del dispositivo" : voiceReferenceId ? "Referencia autorizada · español" : "Prepará una muestra autorizada"}</p>
                </div>
              </div>
              <VoiceBars active={callerSpeaking || participantSpeaking} />
            </div>
          </div>

          <div className="space-y-4 p-5">
            {phase === "idle" || phase === "error" || phase === "finished" ? (
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <button
                  type="button"
                  onClick={startCall}
                  disabled={!canStart}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-cyan-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Phone className="h-4 w-4" /> Iniciar simulación
                </button>
                {referenceUrl && <audio className="h-10 w-full sm:max-w-[260px]" controls preload="none" src={referenceUrl}>Audio de referencia</audio>}
              </div>
            ) : null}

            {phase === "listening" && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <SafetyAction icon={<ShieldCheck className="h-4 w-4" />} onClick={() => submitAction("verify")} label="Verificar por canal oficial" />
                  <SafetyAction icon={<ShieldX className="h-4 w-4" />} onClick={() => submitAction("refuse")} label="No compartir códigos" />
                  <SafetyAction icon={<PhoneOff className="h-4 w-4" />} onClick={() => submitAction("report")} label="Cortar y reportar" />
                </div>
                <div className="flex gap-2">
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value.slice(0, 600))}
                    onKeyDown={(event) => { if (event.key === "Enter") submitText(); }}
                    placeholder="Respondé como si atendieras esta llamada…"
                    aria-label="Tu respuesta a la llamada simulada"
                    className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-500"
                  />
                  <button type="button" onClick={submitText} disabled={!draft.trim()} className="rounded-xl bg-slate-700 px-4 text-sm font-semibold text-white transition hover:bg-slate-600 disabled:opacity-40">Responder</button>
                  <button type="button" onClick={recording ? stopRecording : startRecording} aria-label={recording ? "Detener grabación" : "Responder con micrófono"} className={`flex w-12 items-center justify-center rounded-xl border ${recording ? "border-rose-500 bg-rose-600 text-white" : "border-cyan-700 bg-cyan-950/50 text-cyan-300 hover:bg-cyan-900/60"}`}>
                    {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">El micrófono graba hasta 8 segundos y faster-whisper transcribe en este equipo.</p>
              </div>
            )}

            {phase === "processing" && (
              <div className="flex items-center gap-3 rounded-xl border border-cyan-900/50 bg-cyan-950/20 px-4 py-3 text-sm text-cyan-100">
                <LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" /> Generando el siguiente turno en los modelos locales…
              </div>
            )}
            {activeCall && phase !== "processing" && phase !== "connecting" && (
              <button type="button" onClick={hangUp} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-rose-700 hover:text-rose-300">
                <CircleStop className="h-3.5 w-3.5" /> Finalizar llamada
              </button>
            )}
            {error && <p role="status" className="rounded-xl border border-amber-700/30 bg-amber-950/20 px-3 py-2 text-xs leading-5 text-amber-200">{error}</p>}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-cyan-900/40 bg-slate-950/80 p-5 shadow-xl shadow-black/20">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">Guion de práctica</p>
                <h2 className="mt-1 text-lg font-bold text-white">Definí el escenario</h2>
              </div>
              <button
                type="button"
                onClick={() => setScenarioPrompt(DEFAULT_SCENARIO_PROMPT)}
                disabled={activeCall}
                className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] font-semibold text-slate-300 transition hover:border-cyan-700 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Usar ejemplo
              </button>
            </div>
            <label htmlFor="call-scenario-prompt" className="mt-4 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Prompt o contexto de la simulación
              <textarea
                id="call-scenario-prompt"
                value={scenarioPrompt}
                onChange={(event) => setScenarioPrompt(event.target.value.slice(0, MAX_SCENARIO_PROMPT_CHARS))}
                maxLength={MAX_SCENARIO_PROMPT_CHARS}
                rows={5}
                disabled={activeCall || preparingVoice}
                className="mt-1.5 w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-normal normal-case leading-5 text-slate-200 outline-none focus:border-cyan-500 disabled:opacity-60"
              />
            </label>
            <div className="mt-1 flex items-start justify-between gap-3 text-[9px] leading-4 text-slate-500">
              <span>Definí quién llama, a quién, el motivo y el pedido. Ej.: “Soy el presidente del Club Cebollitas; llamo a los socios para hacer posible un pase y solicito una transferencia a tesorería”. Usá datos ficticios; Qwen adapta el diálogo.</span>
              <span className="shrink-0">{scenarioPrompt.length}/{MAX_SCENARIO_PROMPT_CHARS}</span>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-xl shadow-black/20">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">Preparación local</p>
                <h2 className="mt-1 text-lg font-bold text-white">Voz del emisor simulado</h2>
              </div>
              {voiceReferenceId ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <Headphones className="h-5 w-5 text-slate-500" />}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">Cargá al menos 3 segundos de una voz propia o autorizada. Whisper prepara y transcribe localmente el recorte para Qwen3-TTS.</p>
            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 px-4 py-3 transition hover:border-cyan-600">
              <Upload className="h-4 w-4 shrink-0 text-cyan-400" />
              <span className="min-w-0 flex-1 truncate text-xs text-slate-300">{selectedFile?.name || "Elegir archivo de audio"}</span>
              <input type="file" accept="audio/*" className="sr-only" onChange={(event) => {
                const file = event.target.files?.[0] || null;
                setError("");
                setSelectedFile(file);
                setVoiceReferenceId("");
                setReferenceTranscript("");
                setReferenceDuration(null);
                setReferenceUrl("");
                setSourceDuration(null);
                if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
                if (!file) {
                  sourceUrlRef.current = "";
                  setSourceUrl("");
                  return;
                }
                const localUrl = URL.createObjectURL(file);
                sourceUrlRef.current = localUrl;
                setSourceUrl(localUrl);
                const audioMetadata = new Audio();
                audioMetadata.preload = "metadata";
                audioMetadata.onloadedmetadata = () => {
                  const duration = audioMetadata.duration;
                  if (Number.isFinite(duration)) {
                    setSourceDuration(duration);
                    setClipStart(0);
                    setClipEnd(Math.min(duration, 10));
                  }
                };
                audioMetadata.src = localUrl;
              }} />
            </label>
            {selectedFile && sourceDuration === null && <p className="mt-2 text-[10px] text-slate-500">Leyendo duración de la grabación…</p>}
            {sourceUrl && <audio className="mt-3 h-9 w-full" controls preload="metadata" src={sourceUrl}>Previsualización de la grabación</audio>}
            {sourceDuration !== null && sourceDuration > 12 && (
              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <p className="text-[10px] font-semibold text-slate-300">Grabación de {sourceDuration.toFixed(1)} s · elegí el fragmento para la voz</p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <label className="text-[10px] text-slate-500">Inicio (s)
                    <input type="number" min={0} max={Math.max(0, sourceDuration - 5)} step={0.1} value={clipStart} onChange={(event) => {
                      const start = Math.max(0, Number(event.target.value) || 0);
                      const maxStart = Math.max(0, sourceDuration - 5);
                      const boundedStart = Math.min(start, maxStart);
                      setClipStart(boundedStart);
                      setClipEnd((current) => Math.min(sourceDuration, Math.max(current, boundedStart + 5), boundedStart + 12));
                    }} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white" />
                  </label>
                  <label className="text-[10px] text-slate-500">Fin (s)
                    <input type="number" min={clipStart + 5} max={Math.min(sourceDuration, clipStart + 12)} step={0.1} value={clipEnd} onChange={(event) => {
                      const end = Number(event.target.value) || clipStart + 5;
                      setClipEnd(Math.min(Math.min(sourceDuration, clipStart + 12), Math.max(clipStart + 5, end)));
                    }} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white" />
                  </label>
                </div>
                <p className="mt-2 text-[9px] text-slate-500">Se extrae y transcribe solo este tramo. Para audios de hasta 12 s se usa la grabación completa.</p>
              </div>
            )}
            <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[11px] leading-5 text-slate-400">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 accent-cyan-400" />
              <span>Confirmo que tengo autorización para usar esta voz en la demostración local.</span>
            </label>
            <button type="button" onClick={prepareVoice} disabled={!selectedFile || sourceDuration === null || !consent || preparingVoice} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-cyan-700/60 bg-cyan-950/30 text-xs font-bold text-cyan-200 transition hover:bg-cyan-900/40 disabled:cursor-not-allowed disabled:opacity-40">
              {preparingVoice ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Transcribiendo y preparando…</> : <><Activity className="h-4 w-4" /> Preparar voz autorizada</>}
            </button>
            {referenceDuration !== null && <p className="mt-3 text-[10px] text-emerald-300">Recorte listo · {referenceDuration.toFixed(1)} s · {voiceReferenceId}</p>}
            {voiceReferenceId && (
              <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Transcripción de la referencia
                <textarea value={referenceTranscript} onChange={(event) => setReferenceTranscript(event.target.value.slice(0, 800))} rows={3} className="mt-1.5 w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-normal normal-case leading-5 text-slate-200 outline-none focus:border-cyan-500" />
              </label>
            )}
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/80 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Transcripción en vivo</p>
                <h2 className="mt-1 text-base font-bold text-white">Registro de la llamada</h2>
              </div>
              <span className="rounded-full border border-slate-700 px-2.5 py-1 text-[10px] text-slate-400">{turns.length} turnos</span>
            </div>
            <div className="max-h-[355px] min-h-[190px] space-y-3 overflow-y-auto p-4" aria-live="polite">
              {turns.length === 0 ? (
                <div className="flex min-h-[155px] flex-col items-center justify-center text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-500"><Phone className="h-5 w-5" /></div>
                  <p className="mt-3 text-xs font-semibold text-slate-300">La conversación va a aparecer acá</p>
                  <p className="mt-1 max-w-[240px] text-[10px] leading-4 text-slate-500">El audio y el texto de esta práctica se procesan en el laboratorio local.</p>
                </div>
              ) : turns.map((turn) => (
                <div key={turn.id} className={`flex ${turn.speaker === "participant" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-xs leading-5 ${turn.speaker === "caller" ? "rounded-tl-sm border border-cyan-900/50 bg-cyan-950/30 text-cyan-50" : "rounded-tr-sm border border-blue-900/50 bg-blue-950/30 text-blue-50"}`}>
                    <p className={`mb-1 text-[9px] font-bold uppercase tracking-[0.16em] ${turn.speaker === "caller" ? "text-cyan-400" : "text-blue-400"}`}>{turn.speaker === "caller" ? "Emisor simulado" : "Participante"}</p>
                    {turn.text}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {phase === "finished" && result && <Debrief result={result} />}

      <section className="flex gap-3 rounded-2xl border border-amber-800/30 bg-amber-950/15 px-4 py-3 text-xs leading-5 text-amber-100/80">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p>Ejercicio defensivo local. La escena no marca teléfonos ni contacta a terceros. Usá solo una voz con autorización y no pronuncies datos reales durante la práctica.</p>
      </section>
    </div>
  );
}

function ModelChip({ label, value, available }: { label: string; value: string; available: boolean }) {
  return (
    <div className="min-w-[130px] rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">
        <span className={`h-1.5 w-1.5 rounded-full ${available ? "bg-emerald-400" : "bg-amber-400"}`} /> {label}
      </div>
      <p className="mt-1 truncate text-[11px] font-semibold text-slate-200">{value}</p>
    </div>
  );
}

function SafetyAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-xl border border-emerald-800/60 bg-emerald-950/30 px-3 py-2 text-[11px] font-semibold text-emerald-200 transition hover:border-emerald-500 hover:bg-emerald-900/40">
      {icon}{label}
    </button>
  );
}

function Debrief({ result }: { result: CallSimulationResult }) {
  const analysis = result.risk_analysis;
  const decisionLabels: Record<string, string> = {
    verify: "Verificar identidad mediante un canal oficial conocido.",
    refuse: "Rechazar el pedido de códigos o credenciales.",
    report: "Cortar y reportar la llamada.",
    hangup: "Finalizar y reportar para verificar por un canal oficial.",
  };
  return (
    <section className="overflow-hidden rounded-3xl border border-emerald-900/50 bg-[linear-gradient(140deg,rgba(6,78,59,0.2),rgba(2,6,23,0.9)_50%)]">
      <div className="flex flex-col gap-4 border-b border-emerald-900/40 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-600/30 bg-emerald-950/60 text-emerald-300"><CheckCircle2 className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Llamada finalizada</p>
            <h2 className="mt-1 text-lg font-bold text-white">Devolución de la práctica</h2>
            <p className="mt-1 text-xs text-slate-300">{result.outcome_message || (result.outcome === "respuesta_defensiva" ? "Elegiste una acción defensiva." : "Repasá cómo verificar y reportar una solicitud inesperada.")}</p>
          </div>
        </div>
        <span className="max-w-md rounded-xl border border-emerald-800/40 bg-emerald-950/30 px-3 py-2 text-xs leading-5 text-emerald-100">{analysis?.summary || "La evaluación semántica local no devolvió un resumen."}</span>
      </div>
      <div className="grid gap-3 border-b border-emerald-900/40 p-5 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Decisión defensiva</p>
          <p className="mt-1 text-xs leading-5 text-slate-200">{decisionLabels[result.defensive_action || ""] || "No se registró una opción defensiva explícita."}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tu respuesta transcripta</p>
          <p className="mt-1 text-xs leading-5 text-slate-300">{result.participant_transcript || "No se registró una respuesta."}</p>
        </div>
      </div>
      {analysis?.factors?.length ? (
        <div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {analysis.factors.map((factor) => (
            <div key={factor.factor_id} className="rounded-xl border border-slate-800 bg-slate-950/65 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold text-slate-200">{factor.factor_name}</p>
                <span className={`h-2 w-2 shrink-0 rounded-full ${factor.estado === "detectado" ? "bg-rose-400" : factor.estado === "evidencia_insuficiente" ? "bg-amber-400" : "bg-emerald-400"}`} />
              </div>
              <p className="mt-2 text-[9px] uppercase tracking-wider text-slate-500">{factor.estado.replaceAll("_", " ")}</p>
              <p className="mt-1 text-[10px] leading-4 text-slate-400">{factor.explicacion}</p>
              {factor.fragmento_cita && <p className="mt-1 border-l border-rose-500/40 pl-2 text-[9px] italic leading-4 text-slate-500">“{factor.fragmento_cita}”</p>}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
