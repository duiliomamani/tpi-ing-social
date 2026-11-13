"use client";

import React, { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { getAudioUrl } from "@/lib/api";

interface AudioABComparisonProps {
  referenceUrl: string;
  generatedUrl: string;
  referenceTitle: string;
  generatedTitle: string;
  sameText?: boolean;
  isActive?: boolean;
}

type Track = "reference" | "generated";

export const AudioABComparison: React.FC<AudioABComparisonProps> = ({
  referenceUrl,
  generatedUrl,
  referenceTitle,
  generatedTitle,
  sameText = false,
  isActive = true,
}) => {
  const referenceAudioRef = useRef<HTMLAudioElement | null>(null);
  const generatedAudioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track>("reference");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [gains, setGains] = useState({ reference: 1, generated: 1 });
  const [levelMatch, setLevelMatch] = useState<"loading" | "matched" | "fallback">("loading");
  const [playerError, setPlayerError] = useState<string | null>(null);

  const urls = { reference: getAudioUrl(referenceUrl), generated: getAudioUrl(generatedUrl) };
  const audioFor = (track: Track) => track === "reference" ? referenceAudioRef.current : generatedAudioRef.current;

  useEffect(() => {
    let cancelled = false;
    let context: AudioContext | null = null;

    const measureRms = async (url: string): Promise<number> => {
      const response = await fetch(url);
      if (!response.ok) throw new Error("No se pudo leer el audio para igualar niveles.");
      const audioBytes = await response.arrayBuffer();
      context ??= new AudioContext();
      const decoded = await context.decodeAudioData(audioBytes);
      let sumSquares = 0;
      let count = 0;
      const stride = Math.max(1, Math.floor(decoded.length / 120_000));
      for (let channel = 0; channel < decoded.numberOfChannels; channel += 1) {
        const samples = decoded.getChannelData(channel);
        for (let index = 0; index < samples.length; index += stride) {
          sumSquares += samples[index] * samples[index];
          count += 1;
        }
      }
      return count ? Math.sqrt(sumSquares / count) : 0;
    };

    const matchLevels = async () => {
      try {
        const [referenceRms, generatedRms] = await Promise.all([
          measureRms(urls.reference),
          measureRms(urls.generated),
        ]);
        if (cancelled || referenceRms <= 0 || generatedRms <= 0) throw new Error("Nivel RMS no medible.");
        const targetRms = Math.min(referenceRms, generatedRms);
        setGains({
          reference: Math.min(1, targetRms / referenceRms),
          generated: Math.min(1, targetRms / generatedRms),
        });
        setLevelMatch("matched");
      } catch {
        if (!cancelled) {
          setGains({ reference: 1, generated: 1 });
          setLevelMatch("fallback");
        }
      }
    };

    setLevelMatch("loading");
    void matchLevels();
    return () => {
      cancelled = true;
      if (context && context.state !== "closed") void context.close();
    };
  }, [urls.reference, urls.generated]);

  useEffect(() => {
    const reference = referenceAudioRef.current;
    const generated = generatedAudioRef.current;
    if (reference) reference.volume = Math.max(0, Math.min(1, volume * gains.reference));
    if (generated) generated.volume = Math.max(0, Math.min(1, volume * gains.generated));
  }, [volume, gains]);

  useEffect(() => {
    if (isActive) return;
    referenceAudioRef.current?.pause();
    generatedAudioRef.current?.pause();
    setIsPlaying(false);
  }, [isActive]);

  useEffect(() => {
    referenceAudioRef.current?.pause();
    generatedAudioRef.current?.pause();
    setSelectedTrack("reference");
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [referenceUrl, generatedUrl]);

  const togglePlayback = () => {
    const audio = audioFor(selectedTrack);
    if (!audio) return;
    setPlayerError(null);
    if (isPlaying) {
      audio.pause();
      return;
    }
    void audio.play().catch(() => setPlayerError("No se pudo reproducir el audio. Comprobá que el backend local siga activo."));
  };

  const selectTrack = (track: Track) => {
    if (track === selectedTrack) return;
    referenceAudioRef.current?.pause();
    generatedAudioRef.current?.pause();
    if (referenceAudioRef.current) referenceAudioRef.current.currentTime = 0;
    if (generatedAudioRef.current) generatedAudioRef.current.currentTime = 0;
    setSelectedTrack(track);
    setIsPlaying(false);
    setCurrentTime(0);
    const nextDuration = (track === "reference" ? referenceAudioRef.current : generatedAudioRef.current)?.duration;
    setDuration(Number.isFinite(nextDuration) ? nextDuration || 0 : 0);
  };

  const handleTimeUpdate = (track: Track) => {
    if (track !== selectedTrack) return;
    const audio = audioFor(track);
    if (!audio) return;
    setCurrentTime(Number.isFinite(audio.currentTime) ? audio.currentTime : 0);
    setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
  };

  const seek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioFor(selectedTrack);
    if (!audio) return;
    audio.currentTime = Number(event.target.value);
    setCurrentTime(audio.currentTime);
  };

  const restart = () => {
    const audio = audioFor(selectedTrack);
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    if (!isPlaying) void audio.play().catch(() => setPlayerError("No se pudo reproducir el audio."));
  };

  return (
    <section className="rounded-lg border border-cyan-500/25 bg-slate-950/60 p-4" aria-label="Comparación A/B de audio">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-xs font-bold text-white">Comparación A/B {sameText ? "· misma frase" : "· voz de referencia y clon"}</h4>
          <p className="mt-1 text-[10px] text-slate-400">Reproducí cada pista por separado con transporte compartido{sameText ? "." : ". Para comparar la misma frase, usá el texto de referencia antes de generar."}</p>
        </div>
        <span className="text-[10px] text-cyan-300" role="status">
          {levelMatch === "loading" ? "Midiendo nivel de reproducción…" : levelMatch === "matched" ? "Nivel aproximado igualado por RMS" : "Nivel RMS no disponible · volumen común"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {(["reference", "generated"] as const).map((track) => {
          const selected = selectedTrack === track;
          const title = track === "reference" ? referenceTitle : generatedTitle;
          return (
            <button
              key={track}
              type="button"
              aria-pressed={selected}
              onClick={() => selectTrack(track)}
              className={`min-w-0 rounded-lg border px-3 py-2 text-left transition ${selected ? "border-cyan-400/70 bg-cyan-950/50" : "border-slate-800 bg-slate-900/60 hover:border-slate-600"}`}
            >
              <span className="block text-[10px] font-bold uppercase tracking-wider text-cyan-300">{track === "reference" ? "A · Referencia" : "B · Clon"}</span>
              <span className="mt-0.5 block truncate text-xs text-slate-200">{title}</span>
            </button>
          );
        })}
      </div>

      <audio
        ref={referenceAudioRef}
        src={urls.reference}
        preload="metadata"
        onTimeUpdate={() => handleTimeUpdate("reference")}
        onLoadedMetadata={() => handleTimeUpdate("reference")}
        onPlay={() => selectedTrack === "reference" && setIsPlaying(true)}
        onPause={() => selectedTrack === "reference" && setIsPlaying(false)}
        onEnded={() => selectedTrack === "reference" && setIsPlaying(false)}
        onError={() => selectedTrack === "reference" && setPlayerError("No se pudo cargar la referencia de audio.")}
      />
      <audio
        ref={generatedAudioRef}
        src={urls.generated}
        preload="metadata"
        onTimeUpdate={() => handleTimeUpdate("generated")}
        onLoadedMetadata={() => handleTimeUpdate("generated")}
        onPlay={() => selectedTrack === "generated" && setIsPlaying(true)}
        onPause={() => selectedTrack === "generated" && setIsPlaying(false)}
        onEnded={() => selectedTrack === "generated" && setIsPlaying(false)}
        onError={() => selectedTrack === "generated" && setPlayerError("No se pudo cargar el clon generado.")}
      />

      <div className="mt-3 flex items-center justify-between gap-3 font-mono text-[10px] text-slate-400">
        <span>{formatTime(currentTime)}</span>
        <input type="range" min={0} max={duration > 0 ? duration : 1} step={0.05} value={Math.min(currentTime, duration || 1)} onChange={seek} disabled={duration <= 0} aria-label="Posición de reproducción A/B" className="h-1.5 flex-1 cursor-pointer appearance-none rounded bg-slate-800 accent-cyan-400 disabled:opacity-50" />
        <span>{formatTime(duration)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={togglePlayback} aria-label={isPlaying ? "Pausar comparación" : "Reproducir comparación"} className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-400 text-black hover:bg-cyan-300">
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
          </button>
          <button type="button" onClick={restart} aria-label="Reiniciar pista seleccionada" className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
        <label className="flex min-w-36 items-center gap-2 text-[10px] text-slate-400">
          <Volume2 className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
          <span className="sr-only">Volumen común</span>
          <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="w-full accent-cyan-400" />
        </label>
      </div>
      {playerError && <p role="alert" className="mt-3 text-[10px] text-rose-300">{playerError}</p>}
      <p className="mt-2 text-[10px] leading-relaxed text-slate-500">La igualación usa RMS global del archivo como ayuda auditiva; no es una medición LUFS ni modifica los WAV originales.</p>
    </section>
  );
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00";
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}
