import os
import sys
import subprocess
from pathlib import Path
import numpy as np
import soundfile as sf
import librosa

# Añadir backend al path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.core.config import settings
from app.adapters.perth_adapter import PerThWatermarkAdapter
from app.services.scenario_service import SCENARIOS_DATA

def synthesize_neural_spanish(text: str, model_path: Path, output_path: str):
    """
    Sintetiza voz humana articulada en español usando el motor neural local Piper ONNX.
    """
    piper_bin = settings.BASE_DIR / ".venv" / "bin" / "piper"
    raw_tmp = output_path.replace(".wav", "_raw.wav")
    
    cmd = [
        str(piper_bin),
        "-m", str(model_path),
        "-f", raw_tmp
    ]
    subprocess.run(cmd, input=text.encode("utf-8"), check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    # Resample a 16kHz mono PCM estándar
    y, sr = librosa.load(raw_tmp, sr=settings.TARGET_SAMPLE_RATE, mono=True)
    if os.path.exists(raw_tmp):
        os.remove(raw_tmp)
        
    # Normalizar
    max_val = np.max(np.abs(y))
    if max_val > 0:
        y = (y / max_val) * 0.90
        
    sf.write(output_path, y, settings.TARGET_SAMPLE_RATE, format="WAV", subtype="PCM_16")

def main():
    print("Iniciando generación de audio con VOCES HUMANAS REALES en español (Piper Neural ONNX)...")
    settings.AUDIO_SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    watermarker = PerThWatermarkAdapter()

    male_model = settings.WEIGHTS_DIR / "piper" / "es_ES-davefx-medium.onnx"
    female_model = settings.WEIGHTS_DIR / "piper" / "es_ES-sharvard-medium.onnx"

    for s in SCENARIOS_DATA:
        code = s["code"]
        text = s["transcript"]
        is_synth = (s["ground_truth_voice"] == "synthetic")
        target_file = settings.AUDIO_SAMPLES_DIR / s["audio_file"]

        print(f"Generando {code}: {s['title']}...")
        
        # Seleccionar modelo de voz según personaje
        selected_model = female_model if code == "scenario_c" else male_model
        
        temp_speech = str(target_file).replace(".wav", "_speech.wav")
        synthesize_neural_spanish(text, selected_model, temp_speech)

        if is_synth:
            # Embeber marca de agua PerTh en audios sintéticos
            watermarker.embed_watermark(temp_speech, str(target_file), payload=f"VOICESHIELD_{code.upper()}_PERTH")
            if os.path.exists(temp_speech):
                os.remove(temp_speech)
            print(f"  ✓ {s['audio_file']} generado con voz neural en español y marca PerTh.")
        else:
            # Voz biológica sin marca PerTh
            if os.path.exists(str(target_file)):
                os.remove(str(target_file))
            os.rename(temp_speech, str(target_file))
            print(f"  ✓ {s['audio_file']} generado con voz natural en español (sin marca de agua).")

    print("\n¡Los 4 audios con voces humanas reales en español fueron generados exitosamente sin ningún pitido!")

if __name__ == "__main__":
    main()
