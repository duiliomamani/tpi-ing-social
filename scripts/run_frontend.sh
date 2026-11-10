#!/bin/bash
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/frontend"

echo "Iniciando Frontend Next.js en http://localhost:3000..."
exec npm run dev
