# VoiceShield Lab 🛡️

**Laboratorio de Vishing y Detección de Voces Sintéticas**  
*Ingeniería social asistida por IA: clonación de voz (vishing) y detección de llamadas fraudulentas.*  
Trabajo Práctico Integrador / TPI — Licenciatura en Seguridad Informática.

---

## 📋 Resumen del Proyecto

**VoiceShield Lab** es una Proof of Concept (PoC) académica completamente funcional diseñada para analizar los tres aspectos críticos del fraude por voz asistido por Inteligencia Artificial:

1. **Generación:** Síntesis directa en español con **F5-TTS**, condicionada por una muestra de voz autorizada y su transcripción literal. El laboratorio puede agregar su marca PerTh después de la generación; F₀ es una medición diagnóstica y no se fuerza a un valor exacto.
2. **Ataque Simulado:** Consola interactiva de llamadas telefónicas ficticias que recrea 4 escenarios pedagógicos (suplantación directiva, extorsión emocional, interacción legítima y vishing clásico con voz humana).
3. **Defensa Multicapa:** Panel de evaluación forense en 4 dimensiones:
   - **Dimensión A (Acústica):** Clasificador de deepfakes de audio **AASIST** (scores crudos no calibrados).
   - **Dimensión B (Procedencia):** Detección de marcas de agua psicoacústicas **PerTh**.
   - **Dimensión C (Ingeniería Social):** Transcripción con **faster-whisper** y análisis semántico de 8 factores de manipulación mediante **Gemma 3 4B (Ollama)**.
   - **Dimensión D (Verificación Out-of-Band):** Regla de oro operacional ante solicitudes sensibles.
4. **Laboratorio Comparativo:** Benchmark reproducible con **FFmpeg** evaluando la degradación de los detectores ante compresión MP3, ruido y filtros telefónicos de banda estrecha (PSTN / G.711).
5. **Modo Exposición Universitaria:** Guía interactiva paso a paso para la defensa oral del proyecto.

---

## 🏗️ Arquitectura del Sistema

```
tpi-ing-social/
├── backend/
│   ├── app/
│   │   ├── adapters/          # Interfaces y adaptadores desacoplados
│   │   │   ├── aasist_adapter.py      # Red AASIST (PyTorch + Forense)
│   │   │   ├── f5_tts_adapter.py      # F5-TTS español condicionado por audio y transcripción
│   │   │   ├── gemma_adapter.py       # Ollama Gemma 3 4B + Prompt Defense
│   │   │   ├── perth_adapter.py       # Spread Spectrum Watermark
│   │   │   └── whisper_adapter.py     # faster-whisper en español
│   │   ├── api/routers/       # Endpoints REST (FastAPI)
│   │   ├── core/              # Configuración y base de datos SQLite
│   │   ├── models/            # Esquemas Pydantic tipados
│   │   ├── services/          # Lógica de negocio independiente
│   │   └── main.py            # Entrypoint API
│   ├── data/
│   │   ├── audio_samples/     # 4 audios pregenerados de los escenarios
│   │   ├── uploads/           # Grabaciones y archivos temporales
│   │   └── experiments/       # Muestras procesadas con FFmpeg
│   ├── tests/                 # Suite de pruebas unitarias y de integración
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js 14 App Router
│   │   ├── components/        # Componentes UI (Dashboard, Simulador, etc.)
│   │   └── lib/               # Clientes API y tipos TypeScript
│   ├── package.json
│   └── tailwind.config.js
├── scripts/
│   ├── generate_demo_samples.py  # Generador de audios para Escenarios A/B/C/D
│   ├── setup_environment.sh      # Instalación automática
│   ├── start_all.sh              # Lanzador dual Backend + Frontend
│   ├── run_backend.sh            # Inicia servidor FastAPI
│   └── run_frontend.sh           # Inicia servidor Next.js
├── LIMITATIONS.md             # Documentación exhaustiva de limitaciones
└── README.md
```

---

## ⚡ Requisitos del Sistema

- **Sistema Operativo:** macOS (optimizado para Apple Silicon M1/M2/M3/M4), Linux (Ubuntu/Debian) o Windows (vía WSL2).
- **Python:** 3.11 o 3.12 (con `uv` o `venv` y `pip`).
- **Node.js:** Versión 18 o superior (v20+ recomendada) y `npm`.
- **FFmpeg:** Instalado en el PATH del sistema (`brew install ffmpeg` en macOS o `apt install ffmpeg` en Linux).
- **Ollama (Opcional pero recomendado para inferencia LLM real):**
  - Descargar de [ollama.com](https://ollama.com)
  - Descargar modelo: `ollama pull gemma3:4b`
  - *Nota:* Si Ollama no está en ejecución, el backend conmuta automáticamente a un motor semántico de contingencia basado en reglas para garantizar operatividad continua.

---

## 🚀 Instalación y Puesta en Marcha

### 1. Clonar el Repositorio
```bash
git clone https://github.com/duiliomamani/tpi-ing-social.git
cd tpi-ing-social
```

### 2. Configuración Rápida Automática
Ejecute el script de configuración integral (prepara entornos virtuales, dependencias y genera las muestras de audio):
```bash
./scripts/setup_environment.sh
```

### 3. Iniciar la Aplicación (Backend + Frontend)
```bash
./scripts/start_all.sh
```
Una vez iniciado:
- **Frontend Web:** Abre en [http://localhost:3000](http://localhost:3000)
- **Backend API & Swagger:** Abre en [http://localhost:8000/docs](http://localhost:8000/docs)

### Pesos del modelo de voz

La instalación usa el código oficial `f5-tts`. El fine-tune español y su vocabulario se descargan aparte porque los pesos no se versionan en Git. Después de instalar las dependencias, ejecute:

```bash
backend/.venv/bin/python scripts/download_f5_spanish.py
```

El checkpoint pesa aproximadamente 1.35 GB y queda en `backend/weights/f5-spanish`. El backend también descarga el vocoder oficial Vocos la primera vez que carga F5-TTS. En la interfaz se requiere una muestra clara de 5–12 segundos y el texto exacto que se oye en ella. Consulte [`docs/investigacion-voz.md`](docs/investigacion-voz.md) para el análisis del artículo comparativo, KikiVoice, F5-TTS y las limitaciones de calidad y licencia.

En Apple Silicon se usa MPS automáticamente. Si macOS no tiene memoria compartida suficiente, el backend reintenta una vez en CPU. Para iniciar directamente en CPU, defina `F5_TTS_DEVICE=cpu` antes de ejecutar `./scripts/start_all.sh`. La demo usa 16 pasos por defecto, acepta referencias de hasta 12 s con transcripción alineada y limita la duración proyectada de cada inferencia a 30 s; cada proceso permite una generación simultánea para proteger la memoria local. La interfaz puede crear un borrador editable con faster-whisper local.

---

## 💻 Instrucciones Específicas por Sistema Operativo

### macOS (Apple Silicon MPS)
```bash
# 1. Instalar dependencias del sistema con Homebrew
brew install ffmpeg node python@3.12

# 2. Configurar backend
python3.12 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
PYTHONPATH=backend backend/.venv/bin/python scripts/generate_demo_samples.py

# 3. Configurar frontend
cd frontend && npm install && cd ..

# 4. Iniciar servidores
./scripts/start_all.sh
```

### Linux (Ubuntu / Debian)
```bash
# 1. Dependencias del sistema
sudo apt update && sudo apt install -y ffmpeg nodejs npm python3.11 python3.11-venv

# 2. Configuración
chmod +x scripts/*.sh
./scripts/setup_environment.sh
./scripts/start_all.sh
```

### Windows (WSL2 recomendado)
Se recomienda ejecutar el proyecto dentro de **WSL2 (Ubuntu)** siguiendo las instrucciones de Linux. Alternativamente, en PowerShell:
```powershell
# Backend
python -m venv backend\.venv
backend\.venv\Scripts\pip install -r backend\requirements.txt
$env:PYTHONPATH="backend"
backend\.venv\Scripts\python scripts\generate_demo_samples.py
backend\.venv\Scripts\uvicorn app.main:app --port 8000 --reload

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

---

## 🎭 Los 4 Escenarios Académicos Predefinidos

| Escenario | Nombre | Tipo de Voz | Intención | Vector Evaluado |
| :--- | :--- | :--- | :--- | :--- |
| **A** | Suplantación Directiva | Sintética (Clonada) | Maliciosa (Vishing) | Autoridad invocada, urgencia inmediata y evasión de ticket formal. |
| **B** | Urgencia Emocional | Sintética (Clonada) | Maliciosa (Vishing) | Explotación de afecto/miedo (retenido en aduana aeroportuaria pidiendo dinero). |
| **C** | Comunicación Legítima | Biológica Humana | Benigna (Control) | Control negativo sin manipulación ni peticiones sensibles. |
| **D** | Falso Soporte TI (OTP) | Biológica Humana | Maliciosa (Vishing) | Demuestra que **el fraude telefónico no requiere IA para ser crítico**. |

---

## 🧪 Ejecución de Pruebas Automatizadas

El proyecto cuenta con una suite completa de pruebas unitarias y de integración:
```bash
PYTHONPATH=backend backend/.venv/bin/pytest backend/tests/test_backend.py -v
```
Pruebas verificadas:
- `test_audio_samples_exist`: Integridad de los archivos WAV de prueba.
- `test_aasist_adapter`: Evaluación técnica de scores acústicos no calibrados.
- `test_perth_watermark_detection`: Detección coherente de marca de agua spread-spectrum.
- `test_social_engineering_factors`: Extracción de factores de manipulación semántica.
- `test_risk_assessment_golden_rule`: Verificación estricta de la Regla de Oro (Escenario D).
- `test_comparative_experiment_pipeline`: Protocolo de robustez con perturbaciones FFmpeg y cálculo de EER.

---

## ⚖️ Marco Ético y Privacidad

1. **Consentimiento Obligatorio:** El módulo de clonación rechaza de forma estricta cualquier procesamiento si el usuario no marca la casilla de autorización legal informada.
2. **Prohibición de Deepfakes de Figuras Públicas:** No se permite emplear identidades de funcionarios o celebridades.
3. **Saneamiento Biométrico:** La aplicación cuenta con un botón de **Purgado Ético** (`/api/admin/clear-lab-data`) para destruir todas las grabaciones temporales y metadatos una vez concluida la evaluación.

---

## 📚 Documentación de Limitaciones

Consulte el archivo [`LIMITATIONS.md`](file:///Users/duiliomamani/dev/facultad/lic-seg-inf/ing-social/tpi-ing-social/LIMITATIONS.md) para un desglose exhaustivo de las limitaciones de AASIST ante canales telefónicos PSTN, la no-universalidad de las marcas de agua y la defensa en profundidad.
