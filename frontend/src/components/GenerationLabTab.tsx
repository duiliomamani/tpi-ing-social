"use client";

import React, { useState, useRef } from "react";
import {
  Mic,
  Square,
  Upload,
  Play,
  CheckCircle2,
  AlertTriangle,
  Download,
  ShieldCheck,
  Layers,
  Sparkles,
  Clock,
  AudioWaveform
} from "lucide-react";
import { synthesizeVoice, uploadVoiceReference, getAudioUrl } from "@/lib/api";
import { VoiceGenerationResponse } from "@/lib/types";
import { AudioPlayer } from "./AudioPlayer";

export const GenerationLabTab: React.FC = () => {
  // Consent
  const [consentGranted, setConsentGranted] = useState(false);
  const [speakerAlias, setSpeakerAlias] = useState("Participante Autorizado #1");

  // Reference Audio
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [referenceInfo, setReferenceInfo] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Text to Synthesize
  const [textToSynthesize, setTextToSynthesize] = useState(
    "Hola, esta es una demostración académica de clonación de voz autorizada para la materia de Ingeniería Social."
  );

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<VoiceGenerationResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Start Mic Recording
  const startRecording = async () => {
    if (!consentGranted) {
      alert("Debe otorgar consentimiento expreso firmado antes de grabar la muestra de voz.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mimeType = typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "");
      
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setRecordedBlobUrl(url);

        // Upload to backend
        const formData = new FormData();
        formData.append("file", audioBlob, "mic_sample.webm");
        formData.append("consent_granted", "true");
        try {
          const res = await uploadVoiceReference(formData);
          setReferenceId(res.reference_id);
          setReferenceInfo(res);
        } catch (err: any) {
          setErrorMessage(err.message);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("No se pudo acceder al micrófono: " + err);
    }
  };

  // Stop Mic Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
    }
  };

  // File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!consentGranted) {
      alert("Debe marcar la casilla de consentimiento expreso antes de cargar archivos de voz.");
      e.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("consent_granted", "true");

    try {
      setErrorMessage(null);
      const res = await uploadVoiceReference(formData);
      setReferenceId(res.reference_id);
      setReferenceInfo(res);
      setRecordedBlobUrl(URL.createObjectURL(file));
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Trigger Local Synthesis
  const handleGenerate = async () => {
    if (!consentGranted) {
      setErrorMessage("No es posible sintetizar sin consentimiento expreso firmado.");
      return;
    }
    if (!textToSynthesize.trim()) {
      setErrorMessage("Ingrese el texto que desea sintetizar.");
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMessage(null);
      const res = await synthesizeVoice({
        text: textToSynthesize,
        reference_audio_id: referenceId || undefined,
        consent_granted: consentGranted,
        speaker_alias: speakerAlias,
        apply_perth_watermark: true
      });
      setGenerationResult(res);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Sparkles className="h-4 w-4" />
          <span>Laboratorio de Síntesis y Clonación Acústica</span>
        </div>
        <h2 className="text-2xl font-black text-white">Generación de Voz Sintética Autorizada</h2>
        <p className="text-xs text-slate-400 mt-1">
          Entorno local para sintetizar desde texto y condicionar el timbre con una muestra autorizada.
          El tono se mide como diagnóstico; no se fuerza a una frecuencia fija.
        </p>
      </div>

      {/* Mandatory Ethics & Consent Box */}
      <div className="rounded-xl border border-cyan-500/30 bg-cyber-850 p-5 shadow-lg">
        <div className="flex items-start space-x-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-white">Declaración de Autorización Expresa y Política Ética</h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              El laboratorio prohíbe taxativamente la clonación de voces de terceros sin consentimiento
              o el uso de identidades de personas públicas. Para habilitar los controles de grabación y síntesis,
              el titular de la muestra debe autorizar formalmente el experimento.
            </p>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentGranted}
                  onChange={(e) => setConsentGranted(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-cyan-500"
                />
                <span className="text-xs font-semibold text-slate-200">
                  Autorizo expresamente el uso de mi muestra de voz con fines de investigación académica en VoiceShield Lab.
                </span>
              </label>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Alias del titular:</span>
                <input
                  type="text"
                  value={speakerAlias}
                  onChange={(e) => setSpeakerAlias(e.target.value)}
                  className="rounded bg-slate-900 border border-slate-700 px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generation Workspace: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Voice Sample Input */}
        <div className="cyber-panel p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Mic className="h-4 w-4 text-cyan-400" />
            <span>Muestra Humana de Referencia</span>
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {/* Record via Mic */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!consentGranted}
              className={`flex flex-col items-center justify-center rounded-lg border p-4 transition ${
                isRecording
                  ? "border-rose-500 bg-rose-500/15 text-rose-400 animate-pulse"
                  : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-cyan-500/40 hover:bg-slate-800"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {isRecording ? <Square className="h-6 w-6 mb-2" /> : <Mic className="h-6 w-6 mb-2 text-cyan-400" />}
              <span className="text-xs font-semibold">
                {isRecording ? "Detener Grabación" : "Grabar del Micrófono"}
              </span>
              <span className="text-[10px] text-slate-500 mt-1">16 kHz mono directo</span>
            </button>

            {/* Upload WAV */}
            <label
              className={`flex flex-col items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 p-4 transition cursor-pointer hover:border-cyan-500/40 hover:bg-slate-800 ${
                !consentGranted ? "opacity-40 pointer-events-none" : ""
              }`}
            >
              <Upload className="h-6 w-6 mb-2 text-cyan-400" />
              <span className="text-xs font-semibold text-slate-300">Cargar Archivo de Audio</span>
              <span className="text-[10px] text-slate-500 mt-1">WAV / MP3 / M4A / WebM</span>
              <input
                type="file"
                accept="audio/*,.wav,.mp3,.ogg,.m4a,.webm"
                onChange={handleFileUpload}
                disabled={!consentGranted}
                className="hidden"
              />
            </label>
          </div>

          {/* Reference Status Details */}
          {referenceInfo && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs space-y-1">
              <div className="flex items-center text-emerald-400 font-semibold space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Referencia Biológica Cargada y Perfilada</span>
              </div>
              <div className="text-slate-300 grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                <span>Duración: {referenceInfo.duration_seconds}s</span>
                <span>Sample Rate: {referenceInfo.sample_rate} Hz</span>
                <span>Canales: {referenceInfo.channels === 1 ? "Mono" : "Stereo"}</span>
              </div>
              {(referenceInfo?.audio_url || recordedBlobUrl) && (
                <div className="pt-2">
                  <AudioPlayer
                    audioUrl={referenceInfo?.audio_url || recordedBlobUrl}
                    isSynthetic={false}
                    title="Muestra Biológica Original del Titular"
                  />
                </div>
              )}
            </div>
          )}

          {/* Text Input to Synthesize */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-slate-300 flex justify-between">
              <span>Texto en Español a Sintetizar:</span>
              <span className="text-[10px] text-slate-500">{textToSynthesize.length} caracteres</span>
            </label>
            <textarea
              rows={3}
              value={textToSynthesize}
              onChange={(e) => setTextToSynthesize(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
              placeholder="Escriba el texto que la voz clonada debe pronunciar..."
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !consentGranted}
            className="w-full flex items-center justify-center space-x-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-bold text-black hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 transition shadow-lg shadow-cyan-900/30"
          >
            {isGenerating ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                <span>Generando voz con el motor disponible...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Sintetizar voz desde texto</span>
              </>
            )}
          </button>

          {errorMessage && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-950/20 p-3 text-xs text-rose-300 flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Column 2: Result & Forensic Comparison */}
        <div className="cyber-panel p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AudioWaveform className="h-4 w-4 text-cyan-400" />
              <span>Resultado de la Inferencia Sintética</span>
            </div>
            {generationResult && (
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/70 border border-cyan-500/30 px-2 py-0.5 rounded">
                {generationResult.generation_time_ms} ms
              </span>
            )}
          </h3>

          {generationResult ? (
            <div className="space-y-4">
              {/* Permanent Academic Synthetic Banner */}
              <div className="rounded-lg border-2 border-amber-500/50 bg-amber-500/15 p-3 text-center shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <span className="text-xs font-black tracking-widest text-amber-300">
                  {generationResult.academic_banner}
                </span>
                <p className="text-[10px] text-amber-200/80 mt-0.5">
                  Firma PerTh embebida: {generationResult.watermark_embedded ? "ACTIVA (Verificable)" : "Inactiva"} | Motor: {generationResult.creator_model}
                </p>
              </div>

              {/* Synthetic Audio Player */}
              <AudioPlayer
                audioUrl={generationResult.audio_url}
                isSynthetic={true}
                creatorModel={generationResult.creator_model}
                title="Audio Sintético Generado (Clon de Voz)"
              />

              {/* Perceptual & Forensic Evaluation Metrics */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-2 text-xs">
                <span className="font-semibold text-slate-300">Mediciones de tono para diagnóstico:</span>
                <div className="grid grid-cols-2 gap-3 text-slate-400 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-500">F0 Referencia (Titular):</span>{" "}
                    <strong className="text-white">
                      {generationResult.ref_pitch_hz ? `${generationResult.ref_pitch_hz} Hz` : "Perfilado"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">F0 mediana de salida:</span>{" "}
                    <strong className="text-emerald-400">
                      {generationResult.cloned_pitch_hz ? `${generationResult.cloned_pitch_hz} Hz` : "No disponible"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Ajuste global de tono:</span>{" "}
                    <strong className="text-cyan-400">
                      {generationResult.pitch_correction_semitones !== undefined && generationResult.pitch_correction_semitones !== null
                        ? `${generationResult.pitch_correction_semitones > 0 ? "+" : ""}${generationResult.pitch_correction_semitones} st`
                        : "No aplicado; conserva la entonación"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Referencia de voz:</span>{" "}
                    <strong className="text-cyan-400">Condicionamiento neuronal del timbre</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Marca de Agua:</span>{" "}
                    <strong className="text-emerald-400">Marca integrada por el motor</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Duración:</span>{" "}
                    <strong className="text-white">{generationResult.duration_seconds}s</strong>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex gap-2">
                <a
                  href={getAudioUrl(generationResult.audio_url)}
                  download={generationResult.filename}
                  className="flex-1 flex items-center justify-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Descargar WAV para Laboratorio</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs text-center p-6">
              <AudioWaveform className="h-10 w-10 text-slate-700 mb-3" />
              <p className="font-medium text-slate-400">Ningún audio sintético generado aún</p>
              <p className="text-[11px] text-slate-600 mt-1 max-w-xs">
                Firme la autorización ética, grabe o cargue una muestra de voz y presione sintetizar para evaluar el clon acústico.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
