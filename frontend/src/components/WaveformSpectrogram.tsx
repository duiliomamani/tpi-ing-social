"use client";

import React, { useEffect, useRef, useState } from "react";
import { Activity, Layers } from "lucide-react";
import { AudioVisualizationData } from "@/lib/types";

interface WaveformSpectrogramProps {
  visualization?: AudioVisualizationData;
  currentTime?: number;
  duration?: number;
  onSeek?: (fraction: number) => void;
}

export const WaveformSpectrogram: React.FC<WaveformSpectrogramProps> = ({
  visualization,
  currentTime = 0,
  duration = 1,
  onSeek
}) => {
  const [viewMode, setViewMode] = useState<"waveform" | "spectrogram">("waveform");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (viewMode === "waveform") {
      // Dibujar Forma de Onda (Waveform)
      const peaks = visualization?.waveform_peaks || Array(100).fill(0.1);
      const barWidth = width / peaks.length;
      const progressFraction = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
      const progressX = progressFraction * width;

      // Fondo
      ctx.fillStyle = "#0c1322";
      ctx.fillRect(0, 0, width, height);

      // Línea central
      ctx.strokeStyle = "#1b2847";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      peaks.forEach((peak, index) => {
        const x = index * barWidth;
        const barHeight = Math.max(3, peak * (height * 0.85));
        const y = (height - barHeight) / 2;

        const isPlayed = x <= progressX;
        ctx.fillStyle = isPlayed ? "#00f0ff" : "#2a3b61";
        ctx.fillRect(x + 1, y, Math.max(1, barWidth - 1), barHeight);
      });

      // Cabezal de reproducción
      if (progressX > 0) {
        ctx.strokeStyle = "#ff007f";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(progressX, 0);
        ctx.lineTo(progressX, height);
        ctx.stroke();
      }
    } else {
      // Dibujar Espectrograma (2D Heatmap Frecuencia vs Tiempo)
      const energyMatrix = visualization?.spectrogram_summary?.energy_matrix;
      if (!energyMatrix || energyMatrix.length === 0) {
        ctx.fillStyle = "#0c1322";
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "#64748b";
        ctx.font = "12px monospace";
        ctx.fillText("Espectrograma STFT no disponible", width / 2 - 100, height / 2);
        return;
      }

      const numFreqs = energyMatrix.length;
      const numTimes = energyMatrix[0].length;
      const cellW = width / numTimes;
      const cellH = height / numFreqs;

      for (let f = 0; f < numFreqs; f++) {
        for (let t = 0; t < numTimes; t++) {
          const energy = energyMatrix[f][t]; // 0 a 1
          // Altas frecuencias arriba (f invertida para representación habitual)
          const y = (numFreqs - 1 - f) * cellH;
          const x = t * cellW;

          // Paleta térmica forense (Negro -> Azul -> Magenta -> Amarillo)
          let r = 0, g = 0, b = 0;
          if (energy < 0.25) {
            b = Math.floor((energy / 0.25) * 180);
          } else if (energy < 0.6) {
            const ratio = (energy - 0.25) / 0.35;
            r = Math.floor(ratio * 200);
            b = Math.floor(180 + ratio * 75);
          } else {
            const ratio = (energy - 0.6) / 0.4;
            r = 255;
            g = Math.floor(ratio * 240);
            b = Math.floor((1 - ratio) * 200);
          }

          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(x, y, cellW + 0.5, cellH + 0.5);
        }
      }

      // Guías de frecuencia según la tasa usada para calcular la STFT.
      const spectrogramSampleRate = visualization.spectrogram_summary.sample_rate || visualization.sample_rate || 16000;
      const nyquistHz = spectrogramSampleRate / 2;
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "9px monospace";
      ctx.fillText(`${formatFrequency(nyquistHz)} (Nyquist)`, 6, 12);
      ctx.fillText(formatFrequency(nyquistHz / 2), 6, height / 2);
      ctx.fillText("0 Hz", 6, height - 6);
    }
  }, [visualization, currentTime, duration, viewMode]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(fraction);
  };

  const handleCanvasKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!onSeek || duration <= 0) return;
    const fraction = Math.max(0, Math.min(1, currentTime / duration));
    let nextFraction: number | null = null;
    if (e.key === "ArrowLeft") nextFraction = fraction - 0.02;
    if (e.key === "ArrowRight") nextFraction = fraction + 0.02;
    if (e.key === "Home") nextFraction = 0;
    if (e.key === "End") nextFraction = 1;
    if (nextFraction !== null) {
      e.preventDefault();
      onSeek(Math.max(0, Math.min(1, nextFraction)));
    }
  };

  const sampleRateLabel = visualization?.sample_rate
    ? `${visualization.sample_rate.toLocaleString("es-AR")} Hz · ${visualization.channels === 1 ? "mono" : `${visualization.channels} canales`}`
    : "Metadatos no disponibles";
  const progress = duration > 0 ? Math.round(Math.max(0, Math.min(1, currentTime / duration)) * 100) : 0;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
        <div className="flex items-center space-x-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-300">
            {viewMode === "waveform" ? "Forma de onda" : "Espectrograma STFT"}
          </span>
          <span className="text-[10px] text-slate-500">({sampleRateLabel})</span>
        </div>

        <div className="flex items-center space-x-1 bg-slate-900 rounded p-0.5 border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode("waveform")}
            aria-pressed={viewMode === "waveform"}
            className={`px-2 py-0.5 text-[11px] rounded transition ${
              viewMode === "waveform" ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            Forma de Onda
          </button>
          <button
            type="button"
            onClick={() => setViewMode("spectrogram")}
            aria-pressed={viewMode === "spectrogram"}
            className={`px-2 py-0.5 text-[11px] rounded transition ${
              viewMode === "spectrogram" ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            Espectrograma
          </button>
        </div>
      </div>

      <div className={`relative overflow-hidden rounded bg-black ${onSeek ? "cursor-pointer" : "cursor-default"}`}>
        <canvas
          ref={canvasRef}
          width={650}
          height={110}
          onClick={onSeek ? handleCanvasClick : undefined}
          onKeyDown={handleCanvasKeyDown}
          role={onSeek ? "slider" : "img"}
          tabIndex={onSeek ? 0 : undefined}
          aria-label={onSeek
            ? `Posición del audio: ${formatTime(currentTime)} de ${formatTime(duration)}`
            : `Visualización de audio: ${viewMode === "waveform" ? "forma de onda" : "espectrograma"}`}
          aria-valuemin={onSeek ? 0 : undefined}
          aria-valuemax={onSeek ? 100 : undefined}
          aria-valuenow={onSeek ? progress : undefined}
          aria-valuetext={onSeek ? `${progress}% · ${formatTime(currentTime)} de ${formatTime(duration)}` : undefined}
          className="block h-28 w-full"
        />
      </div>

      <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1 font-mono">
        <span>0.00s</span>
        <span>Duración: {visualization?.duration?.toFixed(2) || "0.00"}s</span>
      </div>
    </div>
  );
};

function formatFrequency(hz: number): string {
  return hz >= 1000 ? `${(hz / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} kHz` : `${Math.round(hz)} Hz`;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00";
  const totalSeconds = Math.floor(seconds);
  return `${Math.floor(totalSeconds / 60).toString().padStart(2, "0")}:${(totalSeconds % 60).toString().padStart(2, "0")}`;
}
