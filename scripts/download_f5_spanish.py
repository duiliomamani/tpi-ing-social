#!/usr/bin/env python3
"""Download the Spanish F5-TTS checkpoint and vocabulary into ignored weights."""

import os
from pathlib import Path

from huggingface_hub import hf_hub_download


ROOT_DIR = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT_DIR / "backend" / "weights" / "f5-spanish"
MODEL_REPO = "jpgallegoar/F5-Spanish"
MODEL_FILES = ("model_1200000.safetensors", "vocab.txt")


def main() -> None:
    revision = os.getenv("F5_SPANISH_REVISION", "main")
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Descargando {MODEL_REPO}@{revision} en {MODEL_DIR}")
    print("El checkpoint pesa aproximadamente 1.35 GB y no se agrega a Git.")
    for filename in MODEL_FILES:
        local_path = hf_hub_download(
            repo_id=MODEL_REPO,
            filename=filename,
            revision=revision,
            local_dir=str(MODEL_DIR),
        )
        print(f"Listo: {local_path}")

    print("Descarga completa. Reinicie el backend para cargar F5-TTS Español.")


if __name__ == "__main__":
    main()
