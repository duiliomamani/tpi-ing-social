"use client";

import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Volume2, ShieldAlert } from "lucide-react";
import { getAudioUrl } from "@/lib/api";

interface AudioPlayerProps {
  audioUrl?: string;
  isSynthetic?: boolean;
  academicBanner?: string;
  creatorModel?: string;
  onTimeUpdate?: (current: number, total: number) => void;
  title?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  isSynthetic = false,
  academicBanner = "AUDIO SINTÉTICO — DEMOSTRACIÓN ACADÉMICA",
  creatorModel,
  onTimeUpdate,
  title = "Reproductor de Evidencia de Audio"
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const fullUrl = audioUrl ? getAudioUrl(audioUrl) : "";

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current || !fullUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.error(e));
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    const dur = audioRef.current.duration || 0;
    setCurrentTime(cur);
    setDuration(dur);
    if (onTimeUpdate) onTimeUpdate(cur, dur);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const restart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      if (!isPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true));
      }
    }
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-cyber-850 p-4 shadow-lg">
      {/* Permanent Academic Synthetic Label when synthetic */}
      {isSynthetic && (
        <div className="mb-3 flex items-center justify-between rounded-md bg-amber-500/15 border border-amber-500/40 px-3 py-1.5 text-xs font-bold text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            <span className="tracking-wider">{academicBanner}</span>
          </div>
          {creatorModel && (
            <span className="text-[10px] text-amber-200/80 font-mono">
              Motor: {creatorModel}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-300">{title}</span>
        <div className="flex items-center space-x-1 text-slate-400 text-xs font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={fullUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onEnded={handleEnded}
      />

      {/* Progress slider */}
      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.05}
        value={currentTime}
        onChange={handleSeek}
        disabled={!fullUrl}
        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
      />

      {/* Controls */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={togglePlay}
            disabled={!fullUrl}
            className={`flex h-9 w-9 items-center justify-center rounded-full text-black transition shadow-md ${
              isPlaying
                ? "bg-amber-400 hover:bg-amber-300"
                : "bg-cyan-400 hover:bg-cyan-300 shadow-cyan-500/30"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>

          <button
            onClick={restart}
            disabled={!fullUrl}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-slate-400">
          <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
          <span className="font-mono">16.0 kHz PCM</span>
        </div>
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds === 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
