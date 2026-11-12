import os
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import librosa
import numpy as np
import soundfile as sf
import torch

from app.adapters.base import BaseTTSAdapter
from app.adapters.perth_adapter import PerThWatermarkAdapter
from app.core.config import settings


class ChatterboxAdapter(BaseTTSAdapter):
    """Text-to-speech conditioned directly by an authorized voice reference.

    The primary path uses ChatterboxMultilingualTTS. Piper remains only as a
    clearly labelled phonetic fallback; it does not clone the reference voice.
    The primary path does not apply global pitch shifting or LTAS equalization,
    since those post-processing steps can change natural prosody and timbre.
    """

    def __init__(self):
        self.watermarker: Optional[PerThWatermarkAdapter] = None
        self.device = self._select_device()
        self.ckpt_dir = settings.WEIGHTS_DIR / "chatterbox"
        self.piper_bin = Path(
            shutil.which("piper") or settings.BASE_DIR / ".venv" / "bin" / "piper"
        )
        self.piper_weights_dir = settings.WEIGHTS_DIR / "piper"

        self.male_deep_model = self.piper_weights_dir / "es_ES-davefx-medium.onnx"
        self.male_mid_model = self.piper_weights_dir / "es_MX-ald-medium.onnx"
        self.female_model = self.piper_weights_dir / "es_AR-daniela-high.onnx"
        self.fallback_model = self.male_deep_model

        self.tts = None
        self.t3_model_file: Optional[str] = None
        self._init_error: Optional[str] = None
        self._init_chatterbox()

    @staticmethod
    def _select_device() -> str:
        if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            return "mps"
        if torch.cuda.is_available():
            return "cuda"
        return "cpu"

    @property
    def engine_name(self) -> str:
        version = "V2" if self.t3_model_file and "v2" in self.t3_model_file else "Multilingual"
        if self.tts is not None:
            return f"Chatterbox Multilingual TTS {version}"
        if self.piper_bin.is_file() and self.male_deep_model.is_file():
            return "Piper (respaldo fonético, sin clonación de referencia)"
        return "Síntesis de voz (no disponible)"

    def _init_chatterbox(self) -> None:
        required_files = (
            "t3_mtl23ls_v2.safetensors",
            "s3gen.pt",
            "ve.pt",
            "grapheme_mtl_merged_expanded_v1.json",
        )
        missing = [name for name in required_files if not (self.ckpt_dir / name).is_file()]
        if missing:
            self._init_error = "Faltan pesos de Chatterbox TTS: " + ", ".join(missing)
            return

        try:
            from chatterbox.mtl_tts import ChatterboxMultilingualTTS

            self.t3_model_file = "t3_mtl23ls_v2.safetensors"
            self.tts = ChatterboxMultilingualTTS.from_local(
                self.ckpt_dir,
                self.device,
                t3_model=self.t3_model_file,
            )
            print(
                f"[ChatterboxAdapter] TTS multilingüe inicializado "
                f"({self.t3_model_file}, {self.device})"
            )
        except Exception as exc:
            self.tts = None
            self._init_error = str(exc)
            print(f"[ChatterboxAdapter] No se pudo inicializar el TTS neuronal: {exc}")

    def is_available(self) -> Tuple[bool, str]:
        if self.tts is not None:
            return True, f"{self.engine_name} activo en {self.device}; clonación directa texto + referencia"
        if self.piper_bin.is_file() and self.male_deep_model.is_file():
            return (
                True,
                "Respaldo Piper activo; genera voz fonética y no aplica la identidad de la referencia. "
                f"TTS neuronal no disponible: {self._init_error}",
            )
        return False, f"TTS neuronal y respaldo Piper no disponibles: {self._init_error}"

    @staticmethod
    def _median_f0(audio: np.ndarray, sample_rate: int) -> Optional[float]:
        if audio.size == 0:
            return None
        try:
            f0, _, _ = librosa.pyin(audio, fmin=65, fmax=400, sr=sample_rate)
            voiced = f0[~np.isnan(f0)]
            return float(np.median(voiced)) if len(voiced) else None
        except Exception as exc:
            print(f"[ChatterboxAdapter] No se pudo medir F0: {exc}")
            return None

    def _clean_and_profile_reference(self, ref_path: str, temp_clean_path: str) -> Dict[str, Any]:
        """Trim only leading/trailing silence and profile the spoken reference."""
        y, sr = librosa.load(
            ref_path,
            sr=settings.TARGET_SAMPLE_RATE,
            mono=True,
        )
        if y.size == 0:
            raise ValueError("La muestra de referencia no contiene audio.")

        trimmed, _ = librosa.effects.trim(y, top_db=28)
        clean_ref = trimmed if trimmed.size >= int(0.25 * sr) else y
        clean_ref = clean_ref[: 10 * sr]

        peak = float(np.max(np.abs(clean_ref)))
        if peak > 0:
            clean_ref = clean_ref * (0.95 / peak)

        sf.write(temp_clean_path, clean_ref, sr, subtype="PCM_16")
        median_f0 = self._median_f0(clean_ref, sr)
        return {
            "median_f0": median_f0,
            "clean_ref_path": temp_clean_path,
            "clean_audio": clean_ref,
            "sr": sr,
        }

    def _generate_phonetic_speech(self, text: str, target_f0: Optional[float], temp_wav_path: str) -> None:
        """Produce a fallback voice and select a Piper register when available."""
        pitch = target_f0 or 120.0
        if pitch < 135.0:
            selected_model = self.male_deep_model
        elif pitch <= 165.0:
            selected_model = self.male_mid_model
        else:
            selected_model = self.female_model

        if not selected_model.is_file():
            selected_model = self.fallback_model
        if not self.piper_bin.is_file() or not selected_model.is_file():
            raise RuntimeError(
                "No está disponible Chatterbox TTS y tampoco el binario/modelo de Piper para el respaldo."
            )

        cmd = [
            str(self.piper_bin),
            "-m",
            str(selected_model),
            "-f",
            temp_wav_path,
            "--length-scale",
            "1.02",
            "--noise-scale",
            "0.667",
            "--noise-w-scale",
            "0.8",
        ]
        subprocess.run(
            cmd,
            input=text.encode("utf-8"),
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=30,
        )

    def _watermark_fallback(self, output_path: str, enabled: bool) -> bool:
        if not enabled:
            return False
        if self.watermarker is None:
            self.watermarker = PerThWatermarkAdapter()
        return self.watermarker.embed_watermark(output_path, output_path)

    @staticmethod
    def _to_numpy(audio: Any) -> np.ndarray:
        if isinstance(audio, torch.Tensor):
            audio = audio.detach().float().cpu().numpy()
        waveform = np.asarray(audio, dtype=np.float32).squeeze()
        if waveform.ndim != 1:
            raise ValueError(f"El TTS devolvió una forma de audio no soportada: {waveform.shape}")
        if waveform.size == 0:
            raise ValueError("El TTS devolvió un audio vacío.")
        return waveform

    def synthesize(
        self,
        text: str,
        reference_audio_path: Optional[str],
        output_path: str,
        consent_granted: bool,
        apply_watermark: bool = True,
    ) -> Dict[str, Any]:
        if not consent_granted:
            raise PermissionError(
                "VIOLACIÓN DE POLÍTICA ÉTICA: Se requiere el consentimiento expreso e informado "
                "del titular de la voz para ejecutar cualquier proceso de clonación o síntesis."
            )

        start_time = time.time()
        has_ref = bool(reference_audio_path and os.path.exists(reference_audio_path))
        temp_clean_ref = str(Path(output_path).with_name(Path(output_path).stem + "_clean_ref.wav"))
        temp_phonetics = str(Path(output_path).with_name(Path(output_path).stem + "_phonetic_temp.wav"))
        ref_profile: Dict[str, Any] = {"median_f0": None, "clean_ref_path": None, "clean_audio": None}

        try:
            if has_ref:
                ref_profile = self._clean_and_profile_reference(reference_audio_path, temp_clean_ref)

            generated_f0: Optional[float] = None
            pitch_correction: Optional[float] = None
            if self.tts is not None:
                try:
                    generated = self.tts.generate(
                        text=text,
                        language_id="es",
                        audio_prompt_path=ref_profile["clean_ref_path"] if has_ref else None,
                        exaggeration=0.5,
                        cfg_weight=0.5,
                    )
                    waveform = self._to_numpy(generated)
                    output_sample_rate = int(self.tts.sr)
                    # Chatterbox TTS embeds its own PerTh watermark in generate().
                    # Do not run a second watermarker over the same waveform.
                    watermark_applied = True
                    label = (
                        "voz condicionada por muestra de referencia"
                        if has_ref
                        else "voz estándar del modelo, sin muestra de referencia"
                    )
                    creator_model = f"{self.engine_name} — {label}"
                except Exception as exc:
                    print(f"[ChatterboxAdapter] Falló el TTS neuronal; se intentará Piper: {exc}")
                    self._generate_phonetic_speech(
                        text,
                        ref_profile.get("median_f0"),
                        temp_phonetics,
                    )
                    waveform, output_sample_rate = librosa.load(
                        temp_phonetics,
                        sr=settings.TARGET_SAMPLE_RATE,
                        mono=True,
                    )
                    watermark_applied = False
                    creator_model = (
                        "Piper — respaldo fonético; no se aplicó la identidad de la referencia"
                        if has_ref
                        else "Piper — respaldo fonético sin muestra de referencia"
                    )
            else:
                self._generate_phonetic_speech(
                    text,
                    ref_profile.get("median_f0"),
                    temp_phonetics,
                )
                waveform, output_sample_rate = librosa.load(
                    temp_phonetics,
                    sr=settings.TARGET_SAMPLE_RATE,
                    mono=True,
                )
                watermark_applied = False
                creator_model = (
                    "Piper — respaldo fonético; no se aplicó la identidad de la referencia"
                    if has_ref
                    else "Piper — respaldo fonético sin muestra de referencia"
                )

            # For Piper, write first so its output can be watermarked in-place.
            if not creator_model.startswith("Chatterbox"):
                sf.write(output_path, waveform.astype(np.float32), output_sample_rate, subtype="PCM_16")
                if apply_watermark:
                    watermark_applied = self._watermark_fallback(output_path, enabled=True)
            else:
                sf.write(output_path, waveform.astype(np.float32), output_sample_rate, subtype="PCM_16")

            generated_f0 = self._median_f0(waveform, output_sample_rate)
            info = sf.info(output_path)
            return {
                "output_path": output_path,
                "duration_seconds": round(float(info.duration), 2),
                "sample_rate": int(info.samplerate),
                "creator_model": creator_model,
                "is_synthetic": True,
                "watermark_embedded": bool(watermark_applied),
                "academic_banner": settings.SYNTHETIC_AUDIO_BANNER,
                "generation_time_ms": round((time.time() - start_time) * 1000, 2),
                "ref_pitch_hz": round(ref_profile["median_f0"], 1)
                if ref_profile.get("median_f0") is not None
                else None,
                "cloned_pitch_hz": round(generated_f0, 1) if generated_f0 is not None else None,
                # No global pitch shift is applied; F0 values are diagnostic measurements only.
                "pitch_correction_semitones": pitch_correction,
            }
        finally:
            for temp_path in (temp_phonetics, temp_clean_ref):
                if os.path.exists(temp_path):
                    try:
                        os.remove(temp_path)
                    except OSError:
                        pass
