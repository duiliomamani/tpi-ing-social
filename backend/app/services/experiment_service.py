import os
import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple
import numpy as np
from app.core.config import settings
from app.services.audio_processing import apply_ffmpeg_perturbation
from app.services.audio_detection_service import audio_detection_service
from app.models.schemas import (
    ExperimentResult,
    ConfusionMatrixData,
    ExperimentMetrics
)
from app.core.database import get_db_connection

class ExperimentService:
    def __init__(self):
        self.acoustic_detector = audio_detection_service.acoustic_adapter

    def run_comparative_experiment(
        self,
        human_sample_path: str,
        synth_sample_path: str,
        human_source_description: str = "muestra humana declarada por el llamador",
        synthetic_source_description: str = "muestra sintética declarada por el llamador",
    ) -> ExperimentResult:
        """
        Ejecuta el protocolo de robustez experimental reproducible.
        Aplica transformaciones normalizadas con FFmpeg sobre muestras reales y sintéticas:
        1. Limpio (original normalizado 16kHz)
        2. Comprimido MP3 (32 kbps)
        3. Con ruido aditivo (SNR controlado)
        4. Filtro de banda estrecha telefónico (300 Hz - 3400 Hz)
        """
        exp_id = f"exp_{uuid.uuid4().hex[:10]}"
        exp_dir = settings.EXPERIMENTS_DIR / exp_id
        exp_dir.mkdir(parents=True, exist_ok=True)

        conditions = ["clean", "mp3_low", "noise", "telephone"]
        
        # Generar las 8 muestras experimentales
        test_samples: List[Dict[str, Any]] = []

        for cond in conditions:
            # 1. Humano
            h_out = str(exp_dir / f"human_{cond}.wav")
            if not apply_ffmpeg_perturbation(human_sample_path, h_out, cond):
                raise RuntimeError(f"FFmpeg no pudo preparar la variante humana: {cond}")
            test_samples.append({
                "condition": cond,
                "ground_truth": "human",
                "filepath": h_out,
                "label": f"Voz Humana — {cond}"
            })

            # 2. Sintético
            s_out = str(exp_dir / f"synth_{cond}.wav")
            if not apply_ffmpeg_perturbation(synth_sample_path, s_out, cond):
                raise RuntimeError(f"FFmpeg no pudo preparar la variante sintética: {cond}")
            test_samples.append({
                "condition": cond,
                "ground_truth": "synthetic",
                "filepath": s_out,
                "label": f"Voz Sintética — {cond}"
            })

        # Ejecutar el detector acústico experimental en cada variante.
        scores_data = []
        detector_engine = ""
        for sample in test_samples:
            detection = self.acoustic_detector.detect_synthetic(sample["filepath"])
            detector_engine = detection["engine_used"]
            score = detection["raw_score"]
            scores_data.append({
                "condition": sample["condition"],
                "ground_truth": sample["ground_truth"],
                "raw_score": score,
                "label": sample["label"]
            })

        # Matriz de Confusión evaluada en el umbral nominal (0.0)
        threshold = 0.0
        tp = 0  # Sintético predicho como sintético
        tn = 0  # Humano predicho como humano
        fp = 0  # Humano predicho erróneamente como sintético
        fn = 0  # Sintético predicho erróneamente como humano

        for item in scores_data:
            gt = item["ground_truth"]
            is_predicted_synthetic = item["raw_score"] >= threshold
            
            if gt == "synthetic":
                if is_predicted_synthetic:
                    tp += 1
                else:
                    fn += 1
            else:
                if is_predicted_synthetic:
                    fp += 1
                else:
                    tn += 1

        total = len(scores_data)
        accuracy = (tp + tn) / total if total > 0 else 0.0
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0  # False Acceptance Rate
        fnr = fn / (fn + tp) if (fn + tp) > 0 else 0.0  # False Rejection Rate

        # Estimación de la curva EER (Equal Error Rate) barriendo umbrales
        sweep_thresholds = np.linspace(-3.0, 3.0, 31)
        eer_curve_points = []
        best_diff = 1.0
        eer_estimate = None

        for th in sweep_thresholds:
            cur_fp = 0
            cur_fn = 0
            total_human = sum(1 for s in scores_data if s["ground_truth"] == "human")
            total_synth = sum(1 for s in scores_data if s["ground_truth"] == "synthetic")
            
            for item in scores_data:
                pred_synth = item["raw_score"] >= th
                if item["ground_truth"] == "human" and pred_synth:
                    cur_fp += 1
                elif item["ground_truth"] == "synthetic" and not pred_synth:
                    cur_fn += 1

            th_fpr = cur_fp / total_human if total_human > 0 else 0.0
            th_fnr = cur_fn / total_synth if total_synth > 0 else 0.0
            
            eer_curve_points.append({
                "threshold": round(float(th), 2),
                "false_positive_rate": round(th_fpr, 3),
                "false_negative_rate": round(th_fnr, 3)
            })

            diff = abs(th_fpr - th_fnr)
            if diff < best_diff:
                best_diff = diff
                eer_estimate = round((th_fpr + th_fnr) / 2.0, 3)

        dataset_summary = (
            f"Dos grabaciones fuente ({human_source_description}; {synthetic_source_description}), "
            "cada una transformada en cuatro condiciones. Las ocho variantes no son ocho hablantes independientes."
        )
        notes = (
            "Los valores mostrados son las salidas medidas en esta ejecución; no se presupone que el filtro o la compresión "
            "empeoren el detector. El experimento usa una sola grabación fuente por clase, y la procedencia humana de C "
            "es una declaración del operador. Las variantes derivadas no son observaciones independientes; estas métricas "
            "son exploratorias y no estiman rendimiento general ni validan AASIST upstream. Compare las condiciones y "
            "conserve los WAV fuente consentidos solo durante el tiempo necesario."
        )

        matrix = ConfusionMatrixData(
            true_positives=tp,
            true_negatives=tn,
            false_positives=fp,
            false_negatives=fn
        )

        metrics = ExperimentMetrics(
            accuracy=round(accuracy, 3),
            precision=round(precision, 3),
            recall=round(recall, 3),
            f1_score=round(f1, 3),
            false_positive_rate=round(fpr, 3),
            false_negative_rate=round(fnr, 3),
            equal_error_rate_estimate=eer_estimate,
            total_samples=total,
            conditions_tested=["Limpio", "Compresión MP3 32k", "Ruido Blanco", "Filtro Telefónico 300-3400Hz"]
        )

        res = ExperimentResult(
            experiment_id=exp_id,
            title="Benchmark exploratorio del detector acústico VoiceShield",
            detector_engine=detector_engine,
            dataset_summary=dataset_summary,
            confusion_matrix=matrix,
            metrics=metrics,
            eer_curve_points=eer_curve_points,
            timestamp=datetime.now(timezone.utc).isoformat(),
            evaluation_notes=notes
        )

        # Guardar en SQLite
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO experiment_records (id, title, dataset_summary, confusion_matrix_json, metrics_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                exp_id, res.title, res.dataset_summary,
                json.dumps(matrix.model_dump()), json.dumps(metrics.model_dump()), res.timestamp
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error guardando experimento: {e}")

        return res

experiment_service = ExperimentService()
