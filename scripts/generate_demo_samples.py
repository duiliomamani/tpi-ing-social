import os
import sys
from pathlib import Path
import numpy as np
import soundfile as sf

# Añadir backend al path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.core.config import settings
from app.adapters.chatterbox_adapter import ChatterboxAdapter
from app.adapters.perth_adapter import PerThWatermarkAdapter
from app.services.scenario_service import SCENARIOS_DATA

def generate_voice_wave(text: str, base_f0: float = 140.0, is_synthetic: bool = False, speech_rate: float = 0.32) -> np.ndarray:
    """
    Genera una forma de onda de voz rica en formantes en español.
    Si is_synthetic es True: modulación de vocoder rígida con armónicos lineales.
    Si is_synthetic es False: vibrato orgánico, micro-variaciones de pitch y respiración natural.
    """
    sr = 16000
    words = text.split()
    duration = max(3.0, len(words) * speech_rate)
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)

    if is_synthetic:
        # Prosodia rígida / sintetizada con baja modulación de pitch (característica vocoder)
        pitch_contour = base_f0 * (1.0 + 0.04 * np.sin(2 * np.pi * 0.8 * t))
        phase = 2 * np.pi * np.cumsum(pitch_contour) / sr
        # Armónicos con atenuación fija
        carrier = (
            np.sin(phase) +
            0.6 * np.sin(2 * phase) +
            0.35 * np.sin(3 * phase) +
            0.2 * np.sin(4 * phase)
        )
        # Resonadores formánticos
        f1, f2 = 500.0, 1500.0
        res1 = np.sin(2 * np.pi * f1 * t) * np.exp(- (t % 0.04) * 35)
        res2 = np.sin(2 * np.pi * f2 * t) * np.exp(- (t % 0.04) * 45)
        raw_voice = 0.65 * carrier + 0.25 * res1 + 0.1 * res2
    else:
        # Voz humana biológica: micro-jitter aleatorio, vibrato de 5Hz y dinámica no lineal
        vibrato = 0.03 * np.sin(2 * np.pi * 5.2 * t)
        jitter = np.random.normal(0, 0.012, len(t))
        pitch_contour = base_f0 * (1.0 + vibrato + jitter)
        phase = 2 * np.pi * np.cumsum(pitch_contour) / sr
        carrier = (
            np.sin(phase) +
            0.55 * np.sin(2 * phase + 0.2) +
            0.3 * np.sin(3 * phase + 0.4) +
            0.15 * np.sin(4 * phase + 0.6) +
            0.08 * np.sin(5 * phase)
        )
        # Formantes móviles naturales
        f1 = 600.0 + 50.0 * np.sin(2 * np.pi * 0.4 * t)
        f2 = 1750.0 + 100.0 * np.cos(2 * np.pi * 0.6 * t)
        res1 = np.sin(2 * np.pi * f1 * t) * np.exp(- (t % 0.06) * 20)
        res2 = np.sin(2 * np.pi * f2 * t) * np.exp(- (t % 0.06) * 30)
        # Ligera respiración biológica (ruido rosa suave)
        breath = np.random.normal(0, 0.04, len(t))
        raw_voice = 0.55 * carrier + 0.25 * res1 + 0.15 * res2 + 0.05 * breath

    # Envolvente silábica
    word_env = np.ones_like(t)
    samples_per_word = int(sr * speech_rate)
    for i in range(len(words)):
        st = i * samples_per_word
        en = min(len(t), (i + 1) * samples_per_word)
        fade = int(sr * 0.04)
        if en - st > 2 * fade:
            word_env[st:st+fade] *= np.linspace(0, 1, fade)
            word_env[en-fade:en] *= np.linspace(1, 0, fade)

    voice = raw_voice * word_env
    max_amp = np.max(np.abs(voice))
    if max_amp > 0:
        voice = (voice / max_amp) * 0.85

    return voice.astype(np.float32)

def main():
    print("Iniciando generación de muestras de audio para los 4 escenarios académicos...")
    settings.AUDIO_SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    watermarker = PerThWatermarkAdapter()

    for s in SCENARIOS_DATA:
        code = s["code"]
        text = s["transcript"]
        is_synth = (s["ground_truth_voice"] == "synthetic")
        target_file = settings.AUDIO_SAMPLES_DIR / s["audio_file"]

        print(f"Generando {code} ({s['ground_truth_voice']}): {s['title']}...")
        
        # Pitch variable según personaje (hombre / mujer)
        base_f0 = 135.0 if code in ["scenario_a", "scenario_d"] else (190.0 if code == "scenario_c" else 150.0)
        speech_rate = 0.28 if code in ["scenario_a", "scenario_b"] else 0.35  # Más rápido bajo urgencia
        
        audio = generate_voice_wave(text, base_f0=base_f0, is_synthetic=is_synth, speech_rate=speech_rate)
        
        raw_tmp = str(target_file).replace(".wav", "_tmp.wav")
        sf.write(raw_tmp, audio, 16000, format='WAV', subtype='PCM_16')

        if is_synth:
            # Embeber marca de agua PerTh en audios sintéticos
            watermarker.embed_watermark(raw_tmp, str(target_file), payload=f"VOICESHIELD_{code.upper()}_PERTH")
            if os.path.exists(raw_tmp):
                os.remove(raw_tmp)
            print(f"  ✓ {s['audio_file']} creado con marca PerTh.")
        else:
            # Voz humana biológica sin marca
            if os.path.exists(str(target_file)):
                os.remove(str(target_file))
            os.rename(raw_tmp, str(target_file))
            print(f"  ✓ {s['audio_file']} creado (Voz Biológica).")

    print("\n¡Las 4 muestras de audio académico fueron generadas exitosamente!")

if __name__ == "__main__":
    main()
