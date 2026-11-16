#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HTML_FILE="$DIR/frontend/public/presentacion.html"
PORT=3333

echo "=========================================================="
echo "  VoiceShield Lab — Presentación Standalone"
echo "=========================================================="
echo "Iniciando presentación sin levantar backend ni docker..."

# Encontrar puerto libre
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

URL="http://localhost:$PORT/presentacion.html"

open_browser() {
  if command -v open >/dev/null 2>&1; then
    open "$1"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$1"
  elif command -v start >/dev/null 2>&1; then
    start "$1"
  fi
}

if command -v python3 >/dev/null 2>&1; then
  echo "Servidor HTTP local: $URL"
  echo "Abriendo en tu navegador predeterminado..."
  # Abrir en segundo plano tras 1 segundo para dar tiempo a que el servidor arranque
  (sleep 0.8 && open_browser "$URL") &
  echo "Servidor activo solo en este equipo. Presiona Ctrl+C para finalizar."
  exec python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$DIR/frontend/public"
else
  echo "Abriendo archivo local directamente..."
  open_browser "$HTML_FILE"
fi
