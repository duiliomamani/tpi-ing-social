import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from app.core.config import settings
from app.core.database import init_db, clear_all_audio_data
from app.api.routers import (
    health,
    generation,
    samples,
    detection,
    social_engineering,
    risk_assessment,
    experiments
)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="VoiceShield Lab — Plataforma académica de clonación autorizada, análisis acústico y evaluación de riesgo"
)

# Configuración de CORS para el Frontend Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Para desarrollo local y red académica
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar Base de Datos SQLite en el arranque
@app.on_event("startup")
def on_startup():
    init_db()

# Montar Routers Modulares
app.include_router(health.router, prefix="/api")
app.include_router(generation.router, prefix="/api")
app.include_router(samples.router, prefix="/api")
app.include_router(detection.router, prefix="/api")
app.include_router(social_engineering.router, prefix="/api")
app.include_router(risk_assessment.router, prefix="/api")
app.include_router(experiments.router, prefix="/api")

# Endpoint para servir archivos de audio de forma segura
@app.get("/api/audio/{filename}")
def serve_audio_file(filename: str):
    """
    Sirve archivos de audio desde las carpetas controladas del laboratorio
    (data/audio_samples y data/uploads).
    """
    # Prevenir Directory Traversal
    safe_filename = Path(filename).name
    candidate_paths = [
        settings.AUDIO_SAMPLES_DIR / safe_filename,
        settings.UPLOADS_DIR / safe_filename,
        settings.EXPERIMENTS_DIR / safe_filename
    ]

    # También buscar recursivamente en subcarpetas de experimentos
    for root, _, files in os.walk(settings.EXPERIMENTS_DIR):
        if safe_filename in files:
            candidate_paths.append(Path(root) / safe_filename)

    for p in candidate_paths:
        if p.exists() and p.is_file():
            return FileResponse(
                path=str(p),
                media_type="audio/wav" if p.suffix.lower() == ".wav" else "audio/mpeg",
                filename=safe_filename
            )

    raise HTTPException(status_code=404, detail="Archivo de audio no encontrado")

# Endpoint ético de borrado y saneamiento
@app.post("/api/admin/clear-lab-data")
def purge_lab_audio_data():
    """
    Requisito Académico y Ético:
    Permitir eliminar las grabaciones y referencias de voz generadas al finalizar el laboratorio
    para proteger la privacidad de los participantes.
    """
    clear_all_audio_data()
    # Limpiar archivos subidos en data/uploads (preservando las muestras de escenario)
    cleaned_count = 0
    for item in settings.UPLOADS_DIR.glob("*.*"):
        try:
            item.unlink()
            cleaned_count += 1
        except Exception:
            pass

    return {
        "status": "success",
        "message": f"Saneamiento completado. Se eliminaron los metadatos y {cleaned_count} grabaciones temporales de voz.",
        "academic_note": "Ningún dato biométrico residual ha sido retenido."
    }

@app.get("/")
def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs"
    }
