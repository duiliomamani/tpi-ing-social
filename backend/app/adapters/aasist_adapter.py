import os
import time
from typing import Dict, Any, Tuple, List, Optional
import numpy as np
import soundfile as sf
import librosa
import torch
import torch.nn as nn
import torch.nn.functional as F
from app.adapters.base import BaseAudioDetectorAdapter
from app.core.config import settings

# ==========================================
# Experimental VoiceShield acoustic classifier prototype.
# This implementation is not the upstream AASIST architecture or weights.
# ==========================================
class GraphAttentionLayer(nn.Module):
    def __init__(self, in_features: int, out_features: int, num_heads: int = 4):
        super().__init__()
        self.num_heads = num_heads
        self.out_features = out_features
        self.linear = nn.Linear(in_features, out_features * num_heads, bias=False)
        self.attn_weights = nn.Parameter(torch.empty(size=(1, num_heads, out_features * 2)))
        nn.init.xavier_uniform_(self.attn_weights.data, gain=1.414)
        self.leaky_relu = nn.LeakyReLU(0.2)

    def forward(self, h: torch.Tensor) -> torch.Tensor:
        # h: [B, N, in_features]
        b, n, _ = h.shape
        h_prime = self.linear(h).view(b, n, self.num_heads, self.out_features)
        return torch.mean(h_prime, dim=2)

class VoiceShieldAcousticModel(nn.Module):
    """
    Lightweight local prototype used for exploratory audio classification.
    A checkpoint at ACOUSTIC_CHECKPOINT_PATH must match this prototype's architecture;
    its scores are not interchangeable with scores from upstream AASIST.
    """
    def __init__(self):
        super().__init__()
        # Front-end 1D Conv representation
        self.conv1 = nn.Conv1d(1, 32, kernel_size=128, stride=4, padding=64)
        self.bn1 = nn.BatchNorm1d(32)
        self.conv2 = nn.Conv1d(32, 64, kernel_size=64, stride=4, padding=32)
        self.bn2 = nn.BatchNorm1d(64)
        self.conv3 = nn.Conv1d(64, 128, kernel_size=32, stride=4, padding=16)
        self.bn3 = nn.BatchNorm1d(128)
        
        # Graph Attention modules for Spectral & Temporal modeling
        self.gat_spectral = GraphAttentionLayer(128, 64)
        self.gat_temporal = GraphAttentionLayer(64, 32)
        
        # Classification head
        self.fc1 = nn.Linear(32, 16)
        self.classifier = nn.Linear(16, 2)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x shape: [B, 1, T]
        x = F.selu(self.bn1(self.conv1(x)))
        x = F.selu(self.bn2(self.conv2(x)))
        x = F.selu(self.bn3(self.conv3(x)))
        
        # Permute to [B, T, Channels] for graph attention
        x = x.permute(0, 2, 1)
        x = self.gat_spectral(x)
        x = self.gat_temporal(x)
        
        # Global pooling across temporal sequence
        pooled = torch.mean(x, dim=1)
        feat = F.selu(self.fc1(pooled))
        logits = self.classifier(feat)
        return logits

# ==========================================
# VoiceShield acoustic adapter with a spectral baseline.
# ==========================================
class VoiceShieldAcousticAdapter(BaseAudioDetectorAdapter):
    def __init__(self):
        self.device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
        self.weights_path = settings.ACOUSTIC_CHECKPOINT_PATH
        self.model: Optional[VoiceShieldAcousticModel] = None
        self.has_weights = False
        self._init_model()

    def _init_model(self):
        try:
            self.model = VoiceShieldAcousticModel().to(self.device)
            if self.weights_path.exists():
                state_dict = torch.load(str(self.weights_path), map_location=self.device)
                self.model.load_state_dict(state_dict, strict=True)
                self.model.eval()
                self.has_weights = True
            else:
                self.model.eval()
                self.has_weights = False
        except Exception as e:
            self.model = None
            self.has_weights = False

    def is_available(self) -> Tuple[bool, str]:
        if self.has_weights:
            return True, f"Clasificador experimental VoiceShield inicializado en {self.device} con checkpoint local compatible"
        return True, "Baseline espectro-acústico experimental activo; no se cargó un checkpoint AASIST preentrenado"

    def _compute_spectral_spoof_score(self, y: np.ndarray, sr: int) -> float:
        """
        Calcula un score técnico crudo basado en anomalías acústicas típicas
        de vocoders y modelos TTS neurales:
        - Dispersión de pitch
        - Centroide y planitud espectral

        Es una heurística exploratoria, no un clasificador validado ni una
        estimación probabilística de origen.
        """
        if len(y) < sr * 0.5:
            return 0.0

        # 1. Modulación de Frecuencia Fundamental (Pitch Dynamics)
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        active_pitches = pitches[magnitudes > np.median(magnitudes)]
        pitch_std = float(np.std(active_pitches)) if len(active_pitches) > 0 else 0.0

        # 2. Centroide Espectral (Brillo y distribución de armónicos)
        centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)[0]))

        # 3. Spectral Flatness (Tono armónico vs ruido vocoder)
        flatness = float(np.mean(librosa.feature.spectral_flatness(y=y)[0]))

        score = 0.0
        # Reglas heurísticas de laboratorio; no equivalen a un modelo validado.
        if pitch_std < 135.0:
            score += 1.8
        elif pitch_std > 220.0:
            score -= 1.8
        else:
            score -= 0.5

        # Centroide armónico: vocoders suelen desplazar energía armónica hacia frecuencias inusitadas
        if centroid > 1600.0:
            score += 0.8
        elif centroid < 1200.0:
            score -= 0.6

        # Entropía de planitud
        if flatness > 0.005:
            score += 0.8
        elif flatness < 0.001:
            score -= 0.5

        return float(np.clip(score, -4.5, 4.5))

    def detect_synthetic(self, audio_path: str) -> Dict[str, Any]:
        start_time = time.time()
        
        # 1. Cargar y normalizar audio a 16kHz mono
        y, sr = librosa.load(audio_path, sr=settings.TARGET_SAMPLE_RATE, mono=True)
        duration = float(len(y) / sr)

        raw_score: float = 0.0
        engine_used: str = ""

        if self.has_weights and self.model is not None:
            engine_used = "VoiceShield experimental neural prototype (local checkpoint)"
            # Segmentar a 64600 muestras (unos 4 segundos) o rellenar
            target_len = 64600
            if len(y) < target_len:
                y_padded = np.pad(y, (0, target_len - len(y)), 'wrap')
            else:
                y_padded = y[:target_len]
            
            x_tensor = torch.tensor(y_padded, dtype=torch.float32).unsqueeze(0).unsqueeze(0).to(self.device)
            with torch.no_grad():
                logits = self.model(x_tensor) # [1, 2]
                # Logit 0: Bonafide, Logit 1: Spoof
                raw_score = float((logits[0, 1] - logits[0, 0]).cpu().item())
        else:
            engine_used = "VoiceShield experimental spectral-acoustic baseline"
            raw_score = self._compute_spectral_spoof_score(y, sr)

        inference_time_ms = round((time.time() - start_time) * 1000, 2)
        threshold = 0.0

        # Etiqueta heurística/técnica; no representa una identidad ni un hecho concluyente.
        if raw_score > 0.7:
            verdict = "Indicadores compatibles con síntesis"
            interpretation = (
                f"El score exploratorio (+{raw_score:.3f}) supera la zona de corte de ±0.7. "
                "El baseline observa rasgos acústicos que asocia con síntesis; esta señal requiere revisión "
                "y no confirma por sí sola el origen del audio ni la intención de la llamada."
            )
        elif raw_score < -0.7:
            verdict = "Indicadores compatibles con voz humana"
            interpretation = (
                f"El score exploratorio ({raw_score:.3f}) queda por debajo de la zona de corte de ±0.7. "
                "Los rasgos observados son compatibles con voz humana, pero el resultado no autentica al hablante "
                "ni descarta síntesis o manipulación."
            )
        else:
            verdict = "Resultado indeterminado"
            interpretation = (
                f"El puntaje técnico bruto ({raw_score:.3f}) se encuentra en la zona de incertidumbre [-0.7, +0.7]. "
                "Las perturbaciones acústicas (posible compresión, ruido ambiental o duración reducida) impiden emitir "
                "un veredicto concluyente."
            )

        limitations = [
            "Score exploratorio no calibrado: no representa una probabilidad de síntesis, fraude o identidad.",
            "Sin checkpoint, se usa una heurística espectro-acústica del laboratorio; no es AASIST preentrenado.",
            "El clasificador neuronal opcional usa la arquitectura experimental de VoiceShield, no la implementación upstream de AASIST.",
            "Sensible a códecs de telefonía (G.711 / AMR) y compresión MP3 con bitrate bajo.",
            "Grabaciones con alto ruido de fondo o reverberación pueden desplazar los scores hacia la zona indeterminada.",
            "La síntesis o la marca de agua no determinan si el contenido es malicioso; analice el mensaje y la identidad por separado."
        ]

        return {
            "model_name": "VoiceShield Acoustic Prototype",
            "model_version": "experimental-checkpoint" if self.has_weights else "spectral-baseline-v1",
            "engine_used": engine_used,
            "raw_score": round(raw_score, 4),
            "is_calibrated": False,
            "decision_threshold": threshold,
            "verdict": verdict,
            "technical_interpretation": interpretation,
            "limitations": limitations,
            "inference_time_ms": inference_time_ms
        }


# Compatibility alias for imports from the earlier prototype name.
AASISTAdapter = VoiceShieldAcousticAdapter
