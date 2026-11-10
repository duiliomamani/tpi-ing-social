import os
import subprocess
import numpy as np
import soundfile as sf
import librosa
from typing import Dict, Any, List, Tuple
from app.core.config import settings

def extract_waveform_peaks(audio_path: str, num_peaks: int = 150) -> List[float]:
    """
    Extrae envolvente de picos normalizada [0, 1] para renderizar formas de onda en el frontend.
    """
    try:
        y, sr = librosa.load(audio_path, sr=settings.TARGET_SAMPLE_RATE, mono=True)
        if len(y) == 0:
            return [0.0] * num_peaks
        
        # Dividir en num_peaks bloques y calcular el valor pico absoluto
        block_size = max(1, len(y) // num_peaks)
        peaks = []
        for i in range(num_peaks):
            start = i * block_size
            end = min(len(y), (i + 1) * block_size)
            if start < len(y):
                chunk = y[start:end]
                peak = float(np.max(np.abs(chunk))) if len(chunk) > 0 else 0.0
            else:
                peak = 0.0
            peaks.append(round(peak, 3))
        
        # Normalizar picos
        max_peak = max(peaks) if max(peaks) > 0 else 1.0
        return [round(p / max_peak, 3) for p in peaks]
    except Exception as e:
        print(f"Error extrayendo forma de onda: {e}")
        return [0.1] * num_peaks

def compute_spectrogram_summary(audio_path: str) -> Dict[str, Any]:
    """
    Calcula una representación resumida del espectrograma STFT (tiempos vs bandas de frecuencia)
    para visualización forense interactiva en el cliente.
    """
    try:
        y, sr = librosa.load(audio_path, sr=settings.TARGET_SAMPLE_RATE, mono=True)
        # STFT
        D = np.abs(librosa.stft(y, n_fft=512, hop_length=256))
        # Convertir a escala logarítmica dB
        D_db = librosa.amplitude_to_db(D, ref=np.max)
        
        # Muestrear a 40 bins de tiempo x 24 bandas de frecuencia
        time_bins = 40
        freq_bins = 24
        
        hop_t = max(1, D_db.shape[1] // time_bins)
        hop_f = max(1, D_db.shape[0] // freq_bins)
        
        matrix = []
        for f in range(freq_bins):
            row = []
            f_start = f * hop_f
            f_end = min(D_db.shape[0], (f + 1) * hop_f)
            for t in range(time_bins):
                t_start = t * hop_t
                t_end = min(D_db.shape[1], (t + 1) * hop_t)
                val = float(np.mean(D_db[f_start:f_end, t_start:t_end]))
                # Normalizar aproximadamente entre 0 y 1 (-80dB a 0dB)
                norm_val = max(0.0, min(1.0, (val + 80.0) / 80.0))
                row.append(round(norm_val, 2))
            matrix.append(row)
            
        return {
            "time_bins": time_bins,
            "freq_bins": freq_bins,
            "duration": float(len(y) / sr),
            "sample_rate": sr,
            "energy_matrix": matrix
        }
    except Exception as e:
        print(f"Error computando espectrograma: {e}")
        return {"time_bins": 0, "freq_bins": 0, "duration": 0.0, "energy_matrix": []}

def apply_ffmpeg_perturbation(
    input_path: str,
    output_path: str,
    perturbation_type: str
) -> bool:
    """
    Aplica transformaciones acústicas controladas con FFmpeg de forma reproducible:
    - mp3_low: Compresión MP3 a 32kbps
    - telephone: Filtro telefónico de banda estrecha PSTN (G.711: 300Hz - 3400Hz)
    - noise: Adición de ruido blanco con SNR controlado
    """
    cmd = []
    if perturbation_type == "mp3_low":
        # Simula compresión agresiva de mensajería / streaming móvil
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-codec:a", "libmp3lame", "-b:a", "32k",
            "-ar", "16000", output_path
        ]
    elif perturbation_type == "telephone":
        # Simula el códec telefónico de voz estándar (bandpass 300 - 3400 Hz)
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-af", "highpass=f=300,lowpass=f=3400",
            "-ar", "16000", output_path
        ]
    elif perturbation_type == "noise":
        # Genera ruido gaussiano y lo mezcla a volumen bajo
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-filter_complex", "anoisesrc=d=60:c=white:a=0.015[noise];[0:a][noise]amix=inputs=2:duration=first",
            "-ar", "16000", output_path
        ]
    else:
        # Copia directa normalizada
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-ar", "16000", output_path
        ]

    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except Exception as e:
        print(f"Error ejecutando FFmpeg para {perturbation_type}: {e}")
        return False
