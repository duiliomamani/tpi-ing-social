import sqlite3
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from app.core.config import settings

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Audio records table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audio_records (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            original_name TEXT,
            sample_rate INTEGER,
            duration REAL,
            is_synthetic INTEGER DEFAULT 0,
            watermark_detected INTEGER DEFAULT 0,
            creator_model TEXT,
            consent_granted INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
    """)
    
    # Analysis results table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analysis_records (
            id TEXT PRIMARY KEY,
            audio_id TEXT,
            acoustic_score REAL,
            acoustic_verdict TEXT,
            watermark_status TEXT,
            transcript TEXT,
            social_engineering_score REAL,
            risk_level TEXT,
            verified_identity INTEGER DEFAULT 0,
            operational_recommendation TEXT,
            details_json TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (audio_id) REFERENCES audio_records (id)
        )
    """)
    
    # Experiments table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS experiment_records (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            dataset_summary TEXT,
            confusion_matrix_json TEXT,
            metrics_json TEXT,
            created_at TEXT NOT NULL
        )
    """)
    
    conn.commit()
    conn.close()

# Helper queries
def save_audio_record(
    audio_id: str,
    filename: str,
    filepath: str,
    original_name: str,
    sample_rate: int,
    duration: float,
    is_synthetic: bool = False,
    watermark_detected: bool = False,
    creator_model: str = "human",
    consent_granted: bool = False
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO audio_records 
        (id, filename, filepath, original_name, sample_rate, duration, is_synthetic, watermark_detected, creator_model, consent_granted, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        audio_id, filename, filepath, original_name, sample_rate, duration,
        1 if is_synthetic else 0, 1 if watermark_detected else 0, creator_model,
        1 if consent_granted else 0, datetime.now(timezone.utc).isoformat()
    ))
    conn.commit()
    conn.close()

def save_analysis_record(
    analysis_id: str,
    audio_id: str,
    acoustic_score: float,
    acoustic_verdict: str,
    watermark_status: str,
    transcript: str,
    social_engineering_score: float,
    risk_level: str,
    verified_identity: bool,
    operational_recommendation: str,
    details: Dict[str, Any]
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO analysis_records 
        (id, audio_id, acoustic_score, acoustic_verdict, watermark_status, transcript, social_engineering_score, risk_level, verified_identity, operational_recommendation, details_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        analysis_id, audio_id, acoustic_score, acoustic_verdict, watermark_status,
        transcript, social_engineering_score, risk_level, 1 if verified_identity else 0,
        operational_recommendation, json.dumps(details), datetime.now(timezone.utc).isoformat()
    ))
    conn.commit()
    conn.close()

def get_audio_record(audio_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audio_records WHERE id = ?", (audio_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def list_audio_records(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audio_records ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def clear_all_audio_data():
    """Remove session audio, analysis, and experiment metadata from the local database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    deleted = {}
    for table in ("analysis_records", "audio_records", "experiment_records"):
        cursor.execute(f"DELETE FROM {table}")
        deleted[table] = cursor.rowcount
    conn.commit()
    conn.close()
    return deleted
