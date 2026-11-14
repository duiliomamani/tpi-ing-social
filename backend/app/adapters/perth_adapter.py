import os
import hashlib
from typing import Dict, Any, Tuple, Optional
import numpy as np
import soundfile as sf
from app.adapters.base import BaseWatermarkAdapter

class PerThWatermarkAdapter(BaseWatermarkAdapter):
    """
    Adaptador experimental de marcas de procedencia.
    Usa PerthNet cuando está instalado; en caso contrario incrusta y consulta
    una firma spread-spectrum propia del laboratorio. Ninguna ruta autentica al
    hablante ni demuestra intención.
    """
    
    CHIP_KEY = "VOICESHIELD_PERTH_MASK_2026_RESEARCH_KEY"
    CARRIER_LEN = 1024

    def __init__(self):
        self._seed = int(hashlib.sha256(self.CHIP_KEY.encode()).hexdigest()[:8], 16)
        rng = np.random.RandomState(self._seed)
        self.carrier_code = rng.choice([-1.0, 1.0], size=self.CARRIER_LEN).astype(np.float32)
        
        # Intentar inicializar PerthNet oficial
        self.perth_net = None
        try:
            import perth
            if hasattr(perth, "PerthImplicitWatermarker") and perth.PerthImplicitWatermarker is not None:
                self.perth_net = perth.PerthImplicitWatermarker()
        except Exception as e:
            print(f"Aviso al cargar PerthImplicitWatermarker: {e}")

    def is_available(self) -> Tuple[bool, str]:
        if self.perth_net is not None:
            return True, "PerthNet disponible para marcar y consultar procedencia; los resultados no autentican hablante o intención"
        return True, "Firma spread-spectrum experimental de VoiceShield activa; no es PerthNet"

    def embed_watermark(
        self,
        input_audio_path: str,
        output_audio_path: str,
        payload: str = "VOICESHIELD_SYNTHETIC_AUDIO_AUTHORIZED"
    ) -> bool:
        """Aplica PerthNet disponible o agrega la firma experimental local de VoiceShield.

        El laboratorio no certifica la perceptibilidad de la marca.
        """
        try:
            data, sr = sf.read(input_audio_path, dtype='float32')
            if len(data.shape) > 1:
                audio_mono = data[:, 0]
            else:
                audio_mono = data

            if self.perth_net is not None:
                # Motor principal: PerthNet Neuronal
                watermarked = self.perth_net.apply_watermark(audio_mono, sample_rate=sr)
            else:
                # Respaldo: Spread Spectrum psicoacústico suave
                n_samples = len(audio_mono)
                carrier_len = self.CARRIER_LEN
                repeats = int(np.ceil(n_samples / carrier_len))
                full_carrier = np.tile(self.carrier_code, repeats)[:n_samples]

                # Factor adaptativo bajo; la audibilidad no se certifica de forma objetiva.
                mean_rms = np.sqrt(np.mean(audio_mono**2)) if len(audio_mono) > 0 else 0.05
                alpha = min(0.003, mean_rms * 0.02)
                watermarked = audio_mono + (alpha * full_carrier)

            # Normalizar para evitar clipping (-1 dBFS)
            max_val = np.max(np.abs(watermarked))
            if max_val > 0.90:
                watermarked = watermarked * (0.90 / max_val)

            sf.write(
                output_audio_path,
                watermarked.astype(np.float32),
                sr,
                format='WAV',
                subtype='PCM_16'
            )
            return True
        except Exception as e:
            print(f"Error embebiendo marca de agua PerTh: {e}")
            return False

    def detect_watermark(self, audio_path: str) -> Dict[str, Any]:
        """
        Consulta la marca con PerthNet, si está disponible, y la firma experimental local.
        """
        try:
            data, sr = sf.read(audio_path, dtype='float32')
            if len(data.shape) > 1:
                data = data[:, 0]

            if len(data) < 1600:
                return {
                    "method_name": (
                        "PerthNet (PerTh)" if self.perth_net is not None else "Firma spread-spectrum experimental VoiceShield"
                    ),
                    "status": "indeterminado",
                    "detected": None,
                    "correlation_score": 0.0,
                    "watermark_payload": None,
                    "interpretation": "Muestra demasiado corta para correlación espectral confiable.",
                    "note": "La ausencia de marca no demuestra origen humano."
                }

            # 1. Análisis con PerthNet Neuronal
            score = 0.0
            detected = False
            if self.perth_net is not None:
                try:
                    score = float(self.perth_net.get_watermark(data, sample_rate=sr))
                    detected = score >= 0.50
                except Exception as e:
                    print(f"Aviso en inferencia PerthNet: {e}")

            # 2. Si no detectó con PerthNet o falló, verificar si contiene firma por correlación
            if not detected:
                carrier_len = self.CARRIER_LEN
                if len(data) >= carrier_len * 2:
                    num_blocks = len(data) // carrier_len
                    blocks = data[:num_blocks * carrier_len].reshape(num_blocks, carrier_len)
                    accumulated_signal = np.mean(blocks, axis=0)
                    dot_product = np.dot(accumulated_signal, self.carrier_code)
                    norm_factor = np.linalg.norm(accumulated_signal) * np.linalg.norm(self.carrier_code) + 1e-8
                    cosine_similarity = dot_product / norm_factor
                    spread_score = float(cosine_similarity * np.sqrt(num_blocks) * 10.0)
                    if spread_score >= 12.0:
                        detected = True
                        score = max(score, min(1.0, spread_score / 20.0))

            method_name = (
                "PerthNet (PerTh) con comprobación de firma VoiceShield"
                if self.perth_net is not None
                else "Firma spread-spectrum experimental VoiceShield"
            )

            if detected:
                status = "detectado"
                interpretation = (
                    f"Se detectó una firma compatible con el método consultado (score: {score:.2f}). "
                    "Esto no identifica quién habla ni determina si el contenido es legítimo."
                )
            else:
                status = "no_detectado"
                interpretation = (
                    f"No se detectó la firma consultada (score: {score:.2f}). "
                    "La ausencia de esta firma no prueba que el audio sea humano ni que no haya sido editado."
                )

            note = (
                "La firma puede ser eliminada, degradada, copiada o detectada incorrectamente. "
                "Su presencia solo es compatible con la marca configurada y no prueba síntesis, identidad o fraude. "
                "Su ausencia tampoco demuestra origen humano."
            )

            return {
                "method_name": method_name,
                "status": status,
                "detected": detected,
                "correlation_score": round(score, 3),
                "watermark_payload": None,
                "interpretation": interpretation,
                "note": note
            }

        except Exception as e:
            return {
                "method_name": "Detector de marca de procedencia experimental",
                "status": "indeterminado",
                "detected": None,
                "correlation_score": 0.0,
                "watermark_payload": None,
                "interpretation": f"Error al procesar archivo de audio: {str(e)}",
                "note": "Error de análisis."
            }
