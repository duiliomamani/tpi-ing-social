"use client";

import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Volume2, ShieldAlert } from "lucide-react";
import { getAudioUrl } from "@/lib/api";

interface AudioPlayerProps {
  audioUrl?: string;
  isActive?: boolean;
  isSynthetic?: boolean;
  academicBanner?: string;
  creatorModel?: string;
  sampleRate?: number;
  channels?: number;
  onTimeUpdate?: (current: number, total: number) => void;
  title?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  isActive = true,
  isSynthetic = false,
  academicBanner = "AUDIO SINTÉTICO — DEMOSTRACIÓN ACADÉMICA",
  creatorModel,
  sampleRate,
  channels,
  onTimeUpdate,
  title = "Reproductor de evidencia de audio"
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const fullUrl = audioUrl ? getAudioUrl(audioUrl) : "";

  useEffect(() => {
    const audio = audioRef.current;
    audio?.pause();
    if (audio) audio.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPlayerError(null);
  }, [audioUrl]);

  useEffect(() => {
    if (isActive) return;
    audioRef.current?.pause();
  }, [isActive]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = Number.isFinite(audioRef.current.currentTime) ? audioRef.current.currentTime : 0;
    const total = Number.isFinite(audioRef.current.duration) ? audioRef.current.duration : 0;
    setCurrentTime(current);
    setDuration(total);
    onTimeUpdate?.(current, total);
  };

  const playAudio = () => {
    const audio = audioRef.current;
    if (!audio || !fullUrl) return;

    setPlayerError(null);
    audio.play().catch(() => {
      setIsPlaying(false);
      setPlayerError("El navegador no pudo reproducir este audio. Revisá que el servicio local siga activo.");
    });
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !fullUrl) return;
    if (isPlaying) audio.pause();
    else playAudio();
  };

  const handleEnded = () => {
    if (audioRef.current) audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    onTimeUpdate?.(0, duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = Number(e.target.value);
    if (!audioRef.current || !Number.isFinite(nextTime)) return;
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const restart = () => {
    if (!audioRef.current) return;
    setPlayerError(null);
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    if (!isPlaying) playAudio();
  };

  const sampleRateLabel = sampleRate && Number.isFinite(sampleRate)
    ? `${sampleRate >= 1000 ? `${(sampleRate / 1000).toFixed(sampleRate % 1000 === 0 ? 0 : 1)} kHz` : `${sampleRate} Hz`}${channels ? ` · ${channels === 1 ? "mono" : `${channels} canales`}` : ""}`
    : "Metadatos no informados";

  return (
    <div role="group" aria-label={title} className="rounded-lg border border-slate-800 bg-cyber-850 p-4 shadow-lg">
      {isSynthetic && (
        <div className="mb-3 flex flex-col gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center space-x-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
            <span className="break-words tracking-wider">{academicBanner}</span>
          </div>
          {creatorModel && <span className="text-[10px] text-amber-200/80 sm:text-right">Motor: {creatorModel}</span>}
        </div>
      )}

      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-300">{title}</span>
        <div className="flex shrink-0 items-center space-x-1 font-mono text-xs text-slate-400" aria-label="Tiempo de reproducción">
          <span>{formatTime(currentTime)}</span>
          <span aria-hidden="true">/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={fullUrl || undefined}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        onError={() => {
          setIsPlaying(false);
          setPlayerError("No se pudo cargar el audio. Verificá la conexión con el backend local.");
        }}
      />

      <input
        type="range"
        min={0}
        max={duration > 0 ? duration : 1}
        step={0.05}
        value={Math.min(currentTime, duration || 1)}
        onChange={handleSeek}
        disabled={!fullUrl || duration <= 0}
        aria-label={`Posición de reproducción: ${formatTime(currentTime)} de ${formatTime(duration)}`}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!fullUrl}
            aria-label={isPlaying ? "Pausar audio" : "Reproducir audio"}
            title={isPlaying ? "Pausar" : "Reproducir"}
            className={`flex h-9 w-9 items-center justify-center rounded-full text-black shadow-md transition ${
              isPlaying ? "bg-amber-400 hover:bg-amber-300" : "bg-cyan-400 shadow-cyan-500/30 hover:bg-cyan-300"
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={restart}
            disabled={!fullUrl}
            aria-label="Reiniciar audio"
            title="Volver al inicio"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-slate-400" aria-label={`Formato: ${sampleRateLabel}`}>
          <Volume2 className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
          <span className="font-mono">{sampleRateLabel}</span>
        </div>
      </div>

      {playerError && (
        <p role="alert" className="mt-3 rounded border border-rose-500/30 bg-rose-950/30 px-2.5 py-2 text-[11px] text-rose-300">
          {playerError}
        </p>
      )}
    </div>
  );
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00";
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}
