#!/bin/bash
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

cleanup() {
    echo ""
    echo "Cerrando servicios de VoiceShield Lab..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "=========================================================="
echo " Iniciando VoiceShield Lab PoC"
echo " Backend:  http://localhost:8000"
echo " Frontend: http://localhost:3000"
echo " Documentación API: http://localhost:8000/docs"
echo " Presione Ctrl+C para detener ambos servidores."
echo "=========================================================="

export PYTHONPATH="$ROOT_DIR/backend"
backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

cd frontend
npm run dev &
FRONTEND_PID=$!

wait
