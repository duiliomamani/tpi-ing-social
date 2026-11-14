import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from app.core.config import ensure_data_directories, settings
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
from app.services.scenario_service import scenario_service

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="VoiceShield Lab — PoC académica de generación de voz con autorización declarada, análisis acústico experimental y evaluación defensiva de riesgo"
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
    ensure_data_directories()
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
    Remove temporary uploads, generated clones, experiment derivatives, local
    analysis metadata, and operator-supplied human scenario recordings.
    """
    ensure_data_directories()
    deleted_records = clear_all_audio_data()
    deleted_files = 0
    failures = []

    def delete_files_under(directory: Path) -> None:
        nonlocal deleted_files
        for item in sorted(directory.rglob("*"), reverse=True):
            if item.is_file() and item.name != ".gitkeep":
                try:
                    item.unlink()
                    deleted_files += 1
                except OSError as exc:
                    failures.append(f"{item.name}: {exc}")
            elif item.is_dir():
                try:
                    item.rmdir()
                except OSError:
                    pass

    delete_files_under(settings.UPLOADS_DIR)
    delete_files_under(settings.EXPERIMENTS_DIR)

    for generated_audio in settings.AUDIO_SAMPLES_DIR.glob("synth_*.wav"):
        try:
            generated_audio.unlink()
            deleted_files += 1
        except OSError as exc:
            failures.append(f"{generated_audio.name}: {exc}")

    try:
        deleted_files += scenario_service.purge_operator_recorded_scenarios()
    except OSError as exc:
        failures.append(f"manifiesto de procedencia: {exc}")

    status_value = "partial" if failures else "success"
    message = (
        f"Limpieza local completada: {deleted_files} archivos y "
        f"{sum(deleted_records.values())} registros de la base local eliminados."
    )
    if failures:
        message += f" No se pudieron eliminar {len(failures)} elementos."

    return {
        "status": status_value,
        "message": message,
        "deleted_files": deleted_files,
        "deleted_database_records": deleted_records,
        "failures": failures,
        "scope_note": (
            "Se conservan las muestras sintéticas A/B del catálogo. Esta limpieza de archivos no garantiza "
            "borrado forense en el almacenamiento y no elimina informes JSON ya descargados por el navegador."
        )
    }

@app.get("/")
def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs"
    }
