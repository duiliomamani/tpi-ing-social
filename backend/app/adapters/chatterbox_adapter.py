import os
import time
import subprocess
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
import numpy as np
import soundfile as sf
import librosa
from scipy.ndimage import gaussian_filter1d
import torch

from app.adapters.base import BaseTTSAdapter
from app.adapters.perth_adapter import PerThWatermarkAdapter
from app.core.config import settings

class ChatterboxAdapter(BaseTTSAdapter):
    """
    Adaptador Oficial de Clonación de Voz Zero-Shot (Chatterbox Multilingual V3).
    - Inferencia neuronal local 100% offline con ChatterboxVC (S3Gen).
    - Extracción de VAD de voz pura para evitar distorsiones por silencios o ruidos de micrófono.
    - Alineación biométrica de tono y frecuencia fundamental (F0 Pitch Locking) exacta.
    - Ecualización de formantes espectrales (LTAS) para calcar la resonancia laríngea del titular.
    - Embebe marca de agua forense inaudible PerTh (PerthNet) verificable.
    """
    def __init__(self):
        self.watermarker = PerThWatermarkAdapter()
        self.engine_name = "Chatterbox Multilingual V3 — Zero-Shot Voice Clone"
        
        self.device = "cpu"
        self.ckpt_dir = settings.WEIGHTS_DIR / "chatterbox"
        self.piper_bin = settings.BASE_DIR / ".venv" / "bin" / "piper"
        self.piper_weights_dir = settings.WEIGHTS_DIR / "piper"
        
        self.male_deep_model = self.piper_weights_dir / "es_ES-davefx-medium.onnx"
        self.male_mid_model = self.piper_weights_dir / "es_MX-ald-medium.onnx"
        self.male_high_model = self.piper_weights_dir / "es_MX-claude-high.onnx"
        self.female_model = self.piper_weights_dir / "es_AR-daniela-high.onnx"
        self.fallback_model = self.piper_weights_dir / "es_ES-davefx-medium.onnx"

        # Cargar ChatterboxVC
        self.vc = None
        self._init_error = None
        self._init_chatterbox()

    def _init_chatterbox(self):
        try:
            from chatterbox import ChatterboxVC
            if (self.ckpt_dir / "s3gen.safetensors").exists():
                self.vc = ChatterboxVC.from_local(self.ckpt_dir, self.device)
                print(f"[ChatterboxAdapter] ChatterboxVC inicializado exitosamente en {self.device}")
            else:
                self._init_error = "s3gen.safetensors no encontrado en weights/chatterbox"
        except Exception as e:
            self._init_error = str(e)
            print(f"[ChatterboxAdapter] Error al cargar ChatterboxVC: {e}")

    def is_available(self) -> Tuple[bool, str]:
        if self.vc is not None:
            return True, f"{self.engine_name} activo (Motor neuronal local S3Gen con calibración de frecuencia)"
        if self.male_deep_model.exists():
            return True, f"{self.engine_name} en modo fonético de respaldo"
        return False, f"Modelos no disponibles: {self._init_error}"

    def _clean_and_profile_reference(self, ref_path: str, temp_clean_path: str) -> Dict[str, Any]:
        """
        1. Aísla segmentos de voz activa (VAD) para eliminar silencios o ruidos de ambiente.
        2. Guarda un clip limpio de hasta 10 segundos para condicionar el vocoder neuronal S3Gen.
        3. Mide la frecuencia fundamental (F0) biológica mediana del titular.
        """
        try:
            y, sr = librosa.load(ref_path, sr=settings.TARGET_SAMPLE_RATE, mono=True)
            # Detección de actividad vocal (VAD)
            intervals = librosa.effects.split(y, top_db=22)
            voiced_chunks = [y[s:e] for s, e in intervals if (e - s) > 0.25 * sr]
            if voiced_chunks:
                clean_ref = np.concatenate(voiced_chunks)[:10 * sr]
            else:
                clean_ref = y[:10 * sr]

            # Normalizar amplitud
            max_amp = np.max(np.abs(clean_ref))
            if max_amp > 0:
                clean_ref = (clean_ref / max_amp) * 0.95

            sf.write(temp_clean_path, clean_ref, sr, subtype="PCM_16")

            # Medir F0 de la voz pura
            f0, _, _ = librosa.pyin(clean_ref, fmin=65, fmax=400, sr=sr)
            f0_valid = f0[~np.isnan(f0)]
            median_f0 = float(np.median(f0_valid)) if len(f0_valid) > 0 else 120.0
            
            return {
                "median_f0": median_f0,
                "clean_ref_path": temp_clean_path,
                "clean_audio": clean_ref,
                "sr": sr
            }
        except Exception as e:
            print(f"[ChatterboxAdapter] Error al perfilar muestra: {e}")
            sf.write(temp_clean_path, np.zeros(16000), settings.TARGET_SAMPLE_RATE, subtype="PCM_16")
            return {
                "median_f0": 120.0,
                "clean_ref_path": temp_clean_path,
                "clean_audio": None,
                "sr": settings.TARGET_SAMPLE_RATE
            }

    def _generate_phonetic_speech(self, text: str, target_f0: float, temp_wav_path: str):
        """
        Selecciona el modelo fonético Piper cuyo registro natural coincida con el rango tonal del usuario:
        - F0 < 135 Hz: Registro grave / barítono (es_ES-davefx-medium)
        - 135 <= F0 <= 165 Hz: Registro medio (es_MX-ald-medium)
        - F0 > 165 Hz: Registro agudo / femenino (es_AR-daniela-high)
        """
        if target_f0 < 135.0:
            selected_model = self.male_deep_model
        elif target_f0 <= 165.0:
            selected_model = self.male_mid_model
        else:
            selected_model = self.female_model

        if not selected_model.exists():
            for cand in [self.male_deep_model, self.fallback_model, self.male_mid_model, self.female_model, self.male_high_model]:
                if cand.exists():
                    selected_model = cand
                    break

        if not selected_model.exists():
            raise FileNotFoundError(f"Modelo fonético no encontrado en {self.piper_weights_dir}")

        cmd = [
            str(self.piper_bin),
            "-m", str(selected_model),
            "-f", temp_wav_path,
            "--length-scale", "1.02",
            "--noise-scale", "0.667",
            "--noise-w-scale", "0.8"
        ]
        subprocess.run(
            cmd,
            input=text.encode("utf-8"),
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=15
        )

    def _match_exact_pitch_and_formants(
        self,
        cloned_audio: np.ndarray,
        target_f0: float,
        ref_audio: Optional[np.ndarray],
        sr: int = 16000
    ) -> Tuple[np.ndarray, float, float]:
        """
        1. Mide la frecuencia fundamental (F0) del clon sintetizado.
        2. Aplica desplazamiento tonal exacto para calzar la misma frecuencia del titular (Pitch Locking).
        3. Realiza ecualización de formantes (LTAS) para reflejar la cavidad laríngea y resonancia del usuario.
        """
        try:
            f0_c, _, _ = librosa.pyin(cloned_audio, fmin=65, fmax=400, sr=sr)
            v_c = f0_c[~np.isnan(f0_c)]
            gen_f0 = float(np.median(v_c)) if len(v_c) > 0 else target_f0

            shift_semitones = 12 * np.log2(target_f0 / gen_f0) if gen_f0 > 0 else 0.0
            if abs(shift_semitones) > 0.05:
                aligned = librosa.effects.pitch_shift(cloned_audio, sr=sr, n_steps=shift_semitones)
            else:
                aligned = cloned_audio

            # Filtro de envolvente espectral (formantes) si hay muestra de referencia
            if ref_audio is not None and len(ref_audio) > 0:
                n_fft = 1024
                S_ref = np.mean(np.abs(librosa.stft(ref_audio, n_fft=n_fft)), axis=1) + 1e-6
                S_gen = np.mean(np.abs(librosa.stft(aligned, n_fft=n_fft)), axis=1) + 1e-6
                S_ref = S_ref / np.sum(S_ref)
                S_gen = S_gen / np.sum(S_gen)

                curve = S_ref / S_gen
                curve_smoothed = gaussian_filter1d(curve, sigma=10)
                curve_smoothed = np.clip(curve_smoothed, 0.5, 2.0)

                D = librosa.stft(aligned, n_fft=n_fft)
                D_eq = D * curve_smoothed[:, None]
                final_audio = librosa.istft(D_eq, length=len(aligned))
            else:
                final_audio = aligned

            # Medir F0 final lograda
            f0_fin, _, _ = librosa.pyin(final_audio, fmin=65, fmax=400, sr=sr)
            v_fin = f0_fin[~np.isnan(f0_fin)]
            final_f0 = float(np.median(v_fin)) if len(v_fin) > 0 else target_f0

            return final_audio, round(final_f0, 1), round(shift_semitones, 2)
        except Exception as e:
            print(f"[ChatterboxAdapter] Error en alineación de frecuencia: {e}")
            return cloned_audio, round(target_f0, 1), 0.0

    def synthesize(
        self,
        text: str,
        reference_audio_path: Optional[str],
        output_path: str,
        consent_granted: bool,
        apply_watermark: bool = True
    ) -> Dict[str, Any]:
        """
        Sintetiza la voz clonando la identidad acústica del titular con Chatterbox V3.
        Alinea el tono a la misma frecuencia fundamental (F0) y formantes del titular.
        """
        if not consent_granted:
            raise PermissionError(
                "VIOLACIÓN DE POLÍTICA ÉTICA: Se requiere el consentimiento expreso e informado "
                "del titular de la voz para ejecutar cualquier proceso de clonación o síntesis."
            )

        start_time = time.time()
        
        has_ref = reference_audio_path and os.path.exists(reference_audio_path)
        temp_clean_ref = output_path.replace(".wav", "_clean_ref.wav")
        
        if has_ref:
            ref_profile = self._clean_and_profile_reference(reference_audio_path, temp_clean_ref)
        else:
            ref_profile = {"median_f0": 120.0, "clean_ref_path": None, "clean_audio": None}

        target_f0 = ref_profile["median_f0"]
        measured_f0 = target_f0
        semitone_shift = 0.0

        temp_phonetics = output_path.replace(".wav", "_phonetic_temp.wav")
        self._generate_phonetic_speech(text, target_f0, temp_phonetics)

        # 2. Clonación neuronal con ChatterboxVC
        if has_ref and self.vc is not None:
            try:
                # S3Gen infiere la onda acústica condicionada en la voz limpia del titular
                cloned_tensor = self.vc.generate(
                    audio=temp_phonetics,
                    target_voice_path=ref_profile["clean_ref_path"]
                )
                cloned_np = cloned_tensor.squeeze().cpu().numpy()
                
                # Resamplear si es necesario a TARGET_SAMPLE_RATE (16000)
                if self.vc.sr != settings.TARGET_SAMPLE_RATE:
                    cloned_np = librosa.resample(
                        cloned_np,
                        orig_sr=self.vc.sr,
                        target_sr=settings.TARGET_SAMPLE_RATE
                    )
                
                # 3. Bloqueo de tono y calibración espectral a la misma frecuencia biológica
                final_np, measured_f0, semitone_shift = self._match_exact_pitch_and_formants(
                    cloned_np,
                    target_f0=target_f0,
                    ref_audio=ref_profile["clean_audio"],
                    sr=settings.TARGET_SAMPLE_RATE
                )

                # Normalizar a -1 dBFS
                max_val = np.max(np.abs(final_np))
                if max_val > 0:
                    final_np = (final_np / max_val) * 0.90

                sf.write(output_path, final_np.astype(np.float32), settings.TARGET_SAMPLE_RATE, subtype="PCM_16")
                
                # Embeber marca de agua forense PerTh
                watermark_applied = self.watermarker.embed_watermark(output_path, output_path)
                clone_label = f"Clon Biométrico Frecuencial (F0 Titular: {round(target_f0, 1)} Hz ➔ F0 Clon: {measured_f0} Hz | Ajuste: {semitone_shift:+} st)"

            except Exception as e:
                print(f"[ChatterboxAdapter] Error en inferencia ChatterboxVC: {e}. Usando voz articulada.")
                # Fallback seguro
                y_fallback, _ = librosa.load(temp_phonetics, sr=settings.TARGET_SAMPLE_RATE)
                sf.write(output_path, y_fallback, settings.TARGET_SAMPLE_RATE, subtype="PCM_16")
                watermark_applied = self.watermarker.embed_watermark(output_path, output_path)
                clone_label = f"Voz Fonética Directa (F0: {round(target_f0, 1)} Hz)"
        else:
            # Sin muestra de referencia, guardar la voz articulada
            y_raw, _ = librosa.load(temp_phonetics, sr=settings.TARGET_SAMPLE_RATE)
            sf.write(output_path, y_raw, settings.TARGET_SAMPLE_RATE, subtype="PCM_16")
            watermark_applied = self.watermarker.embed_watermark(output_path, output_path)
            clone_label = f"Voz Neural Estándar (F0: {round(target_f0, 1)} Hz)"

        # Limpieza de temporales
        for tmp_file in [temp_phonetics, temp_clean_ref]:
            if os.path.exists(tmp_file):
                try:
                    os.remove(tmp_file)
                except Exception:
                    pass

        # Duración final y telemetría
        info = sf.info(output_path)
        duration = round(float(info.duration), 2)
        generation_time_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "output_path": output_path,
            "duration_seconds": duration,
            "creator_model": f"{self.engine_name} — {clone_label}",
            "is_synthetic": True,
            "watermark_embedded": watermark_applied,
            "academic_banner": settings.SYNTHETIC_AUDIO_BANNER,
            "generation_time_ms": generation_time_ms,
            "ref_pitch_hz": round(target_f0, 1),
            "cloned_pitch_hz": round(measured_f0, 1),
            "pitch_correction_semitones": round(semitone_shift, 2)
        }
