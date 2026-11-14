#!/usr/bin/env python3
"""Prepare synthetic scenarios and optionally register consented human recordings.

The human scenarios must never be fabricated with a TTS engine. Their source
audio is supplied by the operator and its origin is declared, not verified,
by this script.
"""

import argparse
import hashlib
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict

import librosa
import numpy as np
import soundfile as sf

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR / "backend"))

from app.core.config import settings  # noqa: E402
from app.adapters.perth_adapter import PerThWatermarkAdapter  # noqa: E402
from app.services.scenario_service import SCENARIOS_DATA  # noqa: E402


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def synthesize_synthetic_scenario(text: str, model_path: Path, output_path: Path) -> None:
    """Create a fictional synthetic voice sample with Piper; no real speaker is cloned."""
    piper_bin = settings.BASE_DIR / ".venv" / "bin" / "piper"
    if not piper_bin.is_file():
        raise FileNotFoundError(f"No se encontró Piper en {piper_bin}")
    if not model_path.is_file():
        raise FileNotFoundError(f"No se encontró el modelo de Piper {model_path}")

    raw_path = output_path.with_name(f"{output_path.stem}_raw.wav")
    command = [str(piper_bin), "-m", str(model_path), "-f", str(raw_path)]
    subprocess.run(
        command,
        input=text.encode("utf-8"),
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    try:
        waveform, _ = librosa.load(str(raw_path), sr=settings.TARGET_SAMPLE_RATE, mono=True)
        peak = float(np.max(np.abs(waveform))) if waveform.size else 0.0
        if peak == 0.0:
            raise ValueError("Piper produjo una muestra vacía o silenciosa.")
        waveform = waveform / peak * 0.90
        sf.write(str(output_path), waveform, settings.TARGET_SAMPLE_RATE, format="WAV", subtype="PCM_16")
    finally:
        raw_path.unlink(missing_ok=True)


def prepare_human_recording(source_path: Path, output_path: Path) -> str:
    """Normalize an operator-supplied human recording and return its source hash."""
    if not source_path.is_file():
        raise FileNotFoundError(f"No se encontró la grabación humana {source_path}")
    waveform, _ = librosa.load(str(source_path), sr=settings.TARGET_SAMPLE_RATE, mono=True)
    if waveform.size < settings.TARGET_SAMPLE_RATE:
        raise ValueError(f"La grabación {source_path.name} debe durar al menos un segundo.")
    if not np.isfinite(waveform).all() or float(np.max(np.abs(waveform))) == 0.0:
        raise ValueError(f"La grabación {source_path.name} no contiene audio válido.")
    peak = float(np.max(np.abs(waveform)))
    waveform = waveform / peak * 0.90
    sf.write(str(output_path), waveform, settings.TARGET_SAMPLE_RATE, format="WAV", subtype="PCM_16")
    return sha256_file(source_path)


def read_existing_manifest(manifest_path: Path) -> Dict[str, Dict]:
    try:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
        scenarios = payload.get("scenarios", {})
        return scenarios if isinstance(scenarios, dict) else {}
    except (OSError, json.JSONDecodeError, TypeError):
        return {}


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Prepara A/B sintéticos. C/D solo se registran desde grabaciones humanas consentidas."
    )
    parser.add_argument("--human-legitimate", type=Path, help="Grabación humana consentida para el escenario C")
    parser.add_argument("--human-malicious", type=Path, help="Grabación humana consentida para el escenario D")
    parser.add_argument(
        "--consent-confirmed",
        action="store_true",
        help="Declara que se cuenta con autorización para procesar ambas grabaciones humanas",
    )
    parser.add_argument(
        "--transcripts-reviewed",
        action="store_true",
        help="Declara que C y D fueron revisadas y corresponden exactamente a los guiones del catálogo",
    )
    args = parser.parse_args()

    has_human_source = bool(args.human_legitimate or args.human_malicious)
    if has_human_source and not (args.human_legitimate and args.human_malicious):
        parser.error("Para preparar C/D se deben proporcionar --human-legitimate y --human-malicious.")
    if has_human_source and not args.consent_confirmed:
        parser.error("Para preparar grabaciones humanas también se requiere --consent-confirmed.")
    if has_human_source and not args.transcripts_reviewed:
        parser.error("Antes de etiquetar C/D, revisá los textos y repetí el comando con --transcripts-reviewed.")

    settings.AUDIO_SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    manifest_path = settings.AUDIO_SAMPLES_DIR / "scenario_provenance.json"
    existing_manifest = read_existing_manifest(manifest_path)
    manifest_entries: Dict[str, Dict] = {}
    watermarker = PerThWatermarkAdapter()

    piper_bin = settings.BASE_DIR / ".venv" / "bin" / "piper"
    synthetic_voice_model = settings.WEIGHTS_DIR / "piper" / "es_ES-davefx-medium.onnx"
    synthetic_scenarios = [s for s in SCENARIOS_DATA if s["ground_truth_voice"] == "synthetic"]
    if piper_bin.is_file() and synthetic_voice_model.is_file():
        for scenario in synthetic_scenarios:
            output_path = settings.AUDIO_SAMPLES_DIR / scenario["audio_file"]
            raw_speech_path = output_path.with_name(f"{output_path.stem}_speech.wav")
            synthesize_synthetic_scenario(scenario["transcript"], synthetic_voice_model, raw_speech_path)
            if not watermarker.embed_watermark(str(raw_speech_path), str(output_path)):
                raw_speech_path.unlink(missing_ok=True)
                raise RuntimeError(f"No se pudo preparar la marca de laboratorio para {scenario['code']}.")
            raw_speech_path.unlink(missing_ok=True)
            manifest_entries[scenario["code"]] = {
                "audio_file": scenario["audio_file"],
                "voice_origin": "synthetic",
                "intent": scenario["ground_truth_intent"],
                "source_kind": "piper_synthetic_voice",
                "source_sha256": None,
                "audio_sha256": sha256_file(output_path),
                "consent_declared": False,
                "watermark_attempted": True,
                "prepared_at": datetime.now(timezone.utc).isoformat(),
            }
            print(f"Preparado {scenario['code']}: voz TTS sintética; intención definida por el guion ficticio.")
    else:
        print("Se omite la generación A/B: falta Piper o alguno de sus modelos locales.")
        print("Los WAV existentes solo se considerarán muestras si tienen una entrada válida en el manifiesto.")
        for scenario in synthetic_scenarios:
            entry = existing_manifest.get(scenario["code"], {})
            path = settings.AUDIO_SAMPLES_DIR / scenario["audio_file"]
            if path.is_file() and entry.get("source_kind") == "piper_synthetic_voice":
                manifest_entries[scenario["code"]] = entry

    human_inputs = {
        "scenario_c": args.human_legitimate,
        "scenario_d": args.human_malicious,
    }
    for code, source_path in human_inputs.items():
        if source_path is None:
            entry = existing_manifest.get(code, {})
            target_path = settings.AUDIO_SAMPLES_DIR / f"{code}.wav"
            if target_path.is_file() and entry.get("source_kind") == "consented_human_recording":
                manifest_entries[code] = entry
            continue

        scenario = next(item for item in SCENARIOS_DATA if item["code"] == code)
        output_path = settings.AUDIO_SAMPLES_DIR / scenario["audio_file"]
        source_hash = prepare_human_recording(source_path.expanduser().resolve(), output_path)
        manifest_entries[code] = {
            "audio_file": scenario["audio_file"],
            "voice_origin": "human",
            "intent": scenario["ground_truth_intent"],
            "source_kind": "consented_human_recording",
            "source_sha256": source_hash,
            "audio_sha256": sha256_file(output_path),
            "consent_declared": True,
            "transcript_reviewed_by_operator": True,
            "prepared_at": datetime.now(timezone.utc).isoformat(),
        }
        print(
            f"Preparado {code} desde grabación aportada. Verificá consentimiento, identidad del origen "
            "y correspondencia exacta con el guion antes de usarla."
        )

    payload = {
        "schema_version": 1,
        "note": "El origen humano y el consentimiento son declaraciones del operador; el laboratorio no los verifica automáticamente.",
        "scenarios": manifest_entries,
    }
    temporary_manifest = manifest_path.with_suffix(".json.tmp")
    temporary_manifest.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary_manifest, manifest_path)
    print(f"Manifiesto de procedencia local escrito en {manifest_path}.")
    print("No se generan ni etiquetan audios Piper como voces humanas.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
