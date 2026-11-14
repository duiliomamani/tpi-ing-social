#!/bin/bash
set -e

echo "=========================================================="
echo " VoiceShield Lab — Script de Configuración Inicial"
echo "=========================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# 1. Verificar Python 3.11 o 3.12
echo "[1/4] Verificando entorno Python..."
PYTHON_BIN=""
if command -v python3.11 &>/dev/null; then
    PYTHON_BIN="python3.11"
elif command -v python3.12 &>/dev/null; then
    PYTHON_BIN="python3.12"
elif command -v python3 &>/dev/null; then
    PYTHON_BIN="python3"
else
    echo "ERROR: No se encontró Python 3 instalado en el sistema."
    exit 1
fi

echo "Utilizando: $($PYTHON_BIN --version)"

# 2. Configurar entorno virtual backend
echo "[2/4] Configurando virtualenv en backend/.venv..."
if [ ! -d "backend/.venv" ]; then
    $PYTHON_BIN -m venv backend/.venv
fi

# Instalar dependencias backend con uv o pip
if command -v uv &>/dev/null; then
    echo "Instalando paquetes con uv..."
    uv pip install --python backend/.venv/bin/python -r backend/requirements.txt
else
    echo "Instalando paquetes con pip..."
    backend/.venv/bin/pip install --upgrade pip
    backend/.venv/bin/pip install -r backend/requirements.txt
fi

# 3. Preparar las muestras sintéticas A/B si Piper y su modelo local están instalados.
# Las muestras humanas C/D se aportan por separado con consentimiento declarado.
echo "[3/4] Preparando muestras sintéticas A/B (si los modelos locales están disponibles)..."
PYTHONPATH=backend backend/.venv/bin/python scripts/generate_demo_samples.py

# 4. Configurar Frontend
echo "[4/4] Instalando dependencias del frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi

echo ""
echo "=========================================================="
echo " ¡Configuración de VoiceShield Lab completada con éxito!"
echo " Para iniciar la aplicación ejecute: ./scripts/start_all.sh"
echo "=========================================================="
