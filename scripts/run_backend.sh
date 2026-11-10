#!/bin/bash
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export PYTHONPATH="$ROOT_DIR/backend"
echo "Iniciando FastAPI Core en http://localhost:8000..."
exec backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
