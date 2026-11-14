# VoiceShield Lab 🛡️

**Laboratorio de generación autorizada de voz y análisis de audio**

*Generación de voz autorizada, detección acústica y análisis de riesgo en comunicaciones.*
Trabajo Práctico Integrador / TPI — Licenciatura en Seguridad Informática.

---

## 📋 Resumen del Proyecto

**VoiceShield Lab** es una Proof of Concept (PoC) académica para experimentar con la generación autorizada de voz y evaluar audios desde varias capas:

1. **Generación:** Síntesis en español con **F5-TTS**, condicionada por una referencia cuya autorización declara el operador y su transcripción revisada. F₀ es una medición diagnóstica; no se fuerza una frecuencia exacta.
2. **Análisis de Audio:** Evaluación de muestras propias y audios de referencia con detección acústica, marcas de procedencia y experimentos de robustez.
3. **Evaluación Multicapa:** Panel de análisis en 4 dimensiones:
   - **Dimensión A (Acústica):** Baseline experimental de VoiceShield; no es la implementación oficial ni un checkpoint preentrenado de AASIST. Sus scores no están calibrados.
   - **Dimensión B (Procedencia):** PerthNet si está instalado; si no, una firma spread-spectrum experimental propia. La detección no acredita identidad, intención ni origen por sí sola.
   - **Dimensión C (Ingeniería Social):** Transcripción con **faster-whisper** y evaluación de 8 factores con **Gemma 3 (Ollama)** o un motor heurístico local de respaldo. El score semántico tampoco es una probabilidad calibrada.
   - **Dimensión D (Verificación Out-of-Band):** Registro manual del operador. La aplicación no llama al contacto ni autentica su identidad.
4. **Laboratorio Comparativo:** Experimento exploratorio con **FFmpeg** sobre dos audios fuente y cuatro condiciones. Reporta las mediciones observadas; no presupone degradación ni estima el desempeño en producción.
5. **Modo Exposición Universitaria:** Guía interactiva paso a paso para la defensa oral del proyecto.

---

## 🏗️ Arquitectura del Sistema

```
tpi-ing-social/
├── backend/
│   ├── app/
│   │   ├── adapters/          # Interfaces y adaptadores desacoplados
│   │   │   ├── aasist_adapter.py      # Baseline acústico experimental de VoiceShield
│   │   │   ├── f5_tts_adapter.py      # F5-TTS español condicionado por audio y transcripción
│   │   │   ├── gemma_adapter.py       # Ollama Gemma + fallback heurístico por reglas
│   │   │   ├── perth_adapter.py       # PerthNet opcional + firma experimental de respaldo
│   │   │   └── whisper_adapter.py     # faster-whisper en español
│   │   ├── api/routers/       # Endpoints REST (FastAPI)
│   │   ├── core/              # Configuración y base de datos SQLite
│   │   ├── models/            # Esquemas Pydantic tipados
│   │   ├── services/          # Lógica de negocio independiente
│   │   └── main.py            # Entrypoint API
│   ├── data/
│   │   ├── audio_samples/     # Casos A-D con manifiesto local de procedencia
│   │   ├── uploads/           # Grabaciones y archivos temporales
│   │   └── experiments/       # Muestras procesadas con FFmpeg
│   ├── tests/                 # Suite de pruebas unitarias y de integración
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js App Router
│   │   ├── components/        # Dashboard, clonación, detección y análisis
│   │   └── lib/               # Clientes API y tipos TypeScript
│   ├── package.json
│   └── tailwind.config.js
├── scripts/
│   ├── generate_demo_samples.py  # Genera A/B TTS y registra C/D humanos consentidos
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
  - *Nota:* Si Ollama no está disponible, se ejecuta un analizador heurístico local. Es una alternativa de menor alcance, no equivalente a Gemma; la interfaz identifica el motor usado.

---

## 🚀 Instalación y Puesta en Marcha

### 1. Clonar el Repositorio
```bash
git clone https://github.com/duiliomamani/tpi-ing-social.git
cd tpi-ing-social
```

### 2. Configuración Rápida Automática
Ejecute el script de configuración integral (prepara entornos virtuales y dependencias; las muestras Piper se generan solo si el modelo está instalado):
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

El checkpoint pesa aproximadamente 1.35 GB y queda en `backend/weights/f5-spanish`. El backend también descarga el vocoder oficial Vocos la primera vez que carga F5-TTS. Puede cargar una grabación fuente de hasta 10 minutos, escucharla y seleccionar manualmente un fragmento de 5–12 segundos. faster-whisper transcribe localmente ese recorte y su texto queda editable para corregirlo antes de generar. Consulte [`docs/investigacion-voz.md`](docs/investigacion-voz.md) para el análisis del artículo comparativo, KikiVoice, F5-TTS y las limitaciones de calidad y licencia.

En Apple Silicon se usa MPS automáticamente. Si macOS no tiene memoria compartida suficiente, el backend reintenta una vez en CPU. Para iniciar directamente en CPU, defina `F5_TTS_DEVICE=cpu` antes de ejecutar `./scripts/start_all.sh`. La demo usa 16 pasos por defecto, pasa a F5 referencias de hasta 12 s y limita la duración proyectada de cada inferencia a 30 s. Reducir pasos puede reducir el tiempo y también afectar la calidad; más pasos no garantizan una voz más natural. La inferencia se ejecuta localmente cuando ya se descargaron los pesos.

La casilla de consentimiento es una declaración del operador: la aplicación no comprueba quién aparece en el audio ni si esa persona autorizó el uso. No se integra KikiVoice ni se envían referencias a servicios de clonación en la nube.

El generador A/B necesita Piper en `backend/.venv/bin/piper` y la voz española `es_ES-davefx-medium.onnx` en `backend/weights/piper/`; el repositorio no distribuye ese binario ni esos pesos. Si faltan, la preparación se omite y el catálogo informa que los WAV no están disponibles.

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

## 🔊 Muestras de Evaluación y Procedencia

El catálogo define cuatro escenarios, pero no inventa grabaciones humanas. A/B pueden generarse localmente con Piper como voces sintéticas de guiones ficticios. C/D requieren grabaciones de participantes con autorización declarada; el laboratorio no puede comprobar automáticamente que el origen sea humano. Las muestras se ofrecen como casos etiquetados solo cuando el archivo y el manifiesto local de procedencia coinciden.

| Muestra | Nombre | Tipo de Voz | Contenido | Vector Evaluado |
| :--- | :--- | :--- | :--- | :--- |
| **A** | Suplantación de autoridad | Piper TTS sintético | Guion malicioso ficticio | Autoridad, urgencia y evasión de canales formales. |
| **B** | Urgencia emocional | Piper TTS sintético | Guion malicioso ficticio | Presión emocional y solicitud de dinero. |
| **C** | Comunicación legítima | Grabación humana consentida requerida | Guion benigno | Control humano-legítimo, si se aporta y registra la grabación. |
| **D** | Solicitud de OTP | Grabación humana consentida requerida | Guion malicioso ficticio | Control de vishing humano, si se aporta y registra la grabación. |

Para preparar el catálogo completo, grabá C y D con autorización, diciendo exactamente sus textos del catálogo, y ejecutá:

```bash
PYTHONPATH=backend backend/.venv/bin/python scripts/generate_demo_samples.py \
  --human-legitimate /ruta/consentida/c.wav \
  --human-malicious /ruta/consentida/d.wav \
  --consent-confirmed \
  --transcripts-reviewed
```

El manifiesto registra hashes y las declaraciones del operador sobre consentimiento y revisión del texto; no las verifica biométrica ni legalmente. Sin C no se ejecuta el benchmark. La matriz de escenarios no es un factorial 2×2 completo: falta una muestra sintética con intención legítima; puede crearse como control durante la demo con una referencia autorizada.

---

## 🧪 Ejecución de Pruebas Automatizadas

La suite de `backend/tests/test_backend.py` verifica el catálogo y los contratos del detector, la marca, el análisis semántico y el benchmark sobre audios temporales. El benchmark requiere FFmpeg. No ejecuta la síntesis F5-TTS ni descarga modelos:
```bash
PYTHONPATH=backend backend/.venv/bin/pytest backend/tests/test_backend.py -v
```
La ejecución de la suite no implica validar el modelo oficial AASIST, exactitud de etiquetas humanas ni rendimiento de producción. Las pruebas no se ejecutaron como parte de esta adaptación.

---

## ⚖️ Marco Ético y Privacidad

1. **Autorización declarada:** El módulo requiere que el operador confirme autorización antes de generar. No comprueba identidad, derechos o consentimiento de forma técnica.
2. **Uso académico:** Usar referencias propias o de participantes que autorizaron el ejercicio. La restricción sobre figuras públicas es una política de uso, no un control técnico de identidad.
3. **Limpieza de sesión:** El endpoint `/api/admin/clear-lab-data` elimina cargas, clones generados, derivados experimentales, metadatos locales y C/D registrados como grabaciones humanas. Conserva A/B sintéticos. El borrado normal de archivos no garantiza eliminación forense y no borra informes JSON descargados por el navegador.

---

## 📚 Documentación de Limitaciones

Consulte [`LIMITATIONS.md`](LIMITATIONS.md) y [`docs/estado-poC-vs-informe.md`](docs/estado-poC-vs-informe.md) para el alcance real, las limitaciones de los modelos, la procedencia de las muestras y las diferencias metodológicas frente al informe presentado.
