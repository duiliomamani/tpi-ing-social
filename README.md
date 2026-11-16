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
   - **Dimensión C (Ingeniería Social):** Transcripción con **faster-whisper** y evaluación de 8 factores con **Qwen3.5:2B (Ollama)** o un motor heurístico local de respaldo. El score semántico tampoco es una probabilidad calibrada.
   - **Dimensión D (Verificación Out-of-Band):** Registro manual del operador. La aplicación no llama al contacto ni autentica su identidad.
4. **Laboratorio Comparativo:** Experimento exploratorio con **FFmpeg** sobre dos audios fuente y cuatro condiciones. Reporta las mediciones observadas; no presupone degradación ni estima el desempeño en producción.
5. **Simulación de llamadas:** Sala 3D local con **Qwen3.5:2B** para generar el diálogo y **Qwen3-TTS Base 0.6B** para sintetizarlo desde una muestra de voz autorizada. El participante responde por texto o micrófono; faster-whisper transcribe localmente y la devolución identifica señales y decisiones defensivas. No se realizan llamadas telefónicas.
6. **Modo Exposición Universitaria:** Guía interactiva paso a paso para la defensa oral del proyecto.

---

## 🏗️ Arquitectura del Sistema

```
tpi-ing-social/
├── backend/
│   ├── Dockerfile             # API FastAPI con PyTorch CPU
│   ├── .dockerignore
│   ├── app/
│   │   ├── adapters/          # Interfaces y adaptadores desacoplados
│   │   │   ├── aasist_adapter.py      # Baseline acústico experimental de VoiceShield
│   │   │   ├── f5_tts_adapter.py      # F5-TTS español condicionado por audio y transcripción
│   │   │   ├── gemma_adapter.py       # Adaptador Ollama (Qwen3.5 por defecto) + fallback heurístico
│   │   │   ├── perth_adapter.py       # PerthNet opcional + firma experimental de respaldo
│   │   │   └── whisper_adapter.py     # faster-whisper en español
│   │   ├── api/routers/       # Endpoints REST y WebSocket (FastAPI)
│   │   │   └── call_simulation.py     # Turnos y acciones de la sala local
│   │   ├── qwen_tts_sidecar.py        # Síntesis progresiva aislada con MLX
│   │   ├── core/              # Configuración y base de datos SQLite
│   │   ├── models/            # Esquemas Pydantic tipados
│   │   ├── services/          # Lógica de negocio independiente; incluye call_simulation_service.py
│   │   └── main.py            # Entrypoint API
│   ├── data/
│   │   ├── audio_samples/     # Casos A-D con manifiesto local de procedencia
│   │   ├── uploads/           # Grabaciones y archivos temporales
│   │   └── experiments/       # Muestras procesadas con FFmpeg
│   ├── tests/                 # Suite de pruebas unitarias y de integración
│   ├── requirements.txt
│   └── requirements-mlx-tts.txt  # Entorno aislado de Qwen3-TTS para Apple Silicon
├── frontend/
│   ├── Dockerfile             # Next.js en modo producción
│   ├── .dockerignore
│   ├── src/
│   │   ├── app/               # Next.js App Router
│   │   ├── components/        # Dashboard, clonación, detección y análisis
│   │   └── lib/               # Clientes API y tipos TypeScript
│   ├── package.json
│   └── tailwind.config.js
├── scripts/
│   ├── generate_demo_samples.py  # Genera A/B TTS y registra C/D humanos consentidos
│   ├── download_f5_spanish.py    # Descarga el checkpoint local de F5-Spanish
│   └── setup_environment.sh      # Preparación opcional para desarrollo nativo
├── compose.yaml                 # Frontend, API, Ollama y descarga del modelo
├── .env.example                 # Clave local del sintetizador nativo
├── LIMITATIONS.md             # Documentación exhaustiva de limitaciones
└── README.md
```

---

## ⚡ Requisitos del Sistema

- **Docker Desktop** con Docker Compose v2.
- **Clonación rápida de voz:** macOS con Apple Silicon para Qwen3-TTS vía MLX. MLX debe ejecutarse en macOS; Docker Desktop ejecuta los contenedores dentro de Linux y no expone Metal al contenedor. En otros equipos, la sala ofrece la voz española del navegador como alternativa, sin clonar la muestra.

---

## 🚀 Instalación y Puesta en Marcha

### 1. Clonar el Repositorio
```bash
git clone https://github.com/duiliomamani/tpi-ing-social.git
cd tpi-ing-social
```

### 2. Iniciar la Aplicación

Levanta el frontend, el backend y Ollama. La primera vez, Docker descarga Qwen3.5:2B en el volumen persistente `ollama_data`; la API espera a que termine esa descarga antes de arrancar.

```bash
cp .env.example .env
docker compose up --build
```
Una vez iniciado:
- **Frontend Web:** Abre en [http://localhost:3000](http://localhost:3000)
- **Backend API & Swagger:** Abre en [http://localhost:8000/docs](http://localhost:8000/docs)

Los contenedores de frontend y backend se construyen para producción. La API usa PyTorch CPU; Ollama se ejecuta en su propio contenedor. Las cargas y resultados permanecen en `backend/data`; los pesos de Ollama quedan en su volumen y no se agregan a Git.

Para detener los servicios, presioná `Ctrl+C` en esa terminal. Para detener y retirar los contenedores, ejecutá `docker compose down`; los pesos descargados y los datos locales se conservan.

### Sintetizador Qwen3-TTS en Apple Silicon

Qwen3-TTS usa MLX/Metal, por eso permanece como un proceso nativo del Mac y se conecta al backend Docker por `host.docker.internal`. La primera vez, prepará su entorno y descargá los pesos:

```bash
python3.12 -m venv backend/.venv-mlx
backend/.venv-mlx/bin/python -m pip install -r backend/requirements-mlx-tts.txt
backend/.venv-mlx/bin/hf download mlx-community/Qwen3-TTS-12Hz-0.6B-Base-8bit
cp .env.example .env
```

En otra terminal, desde la raíz del repositorio, iniciá el sintetizador. Si cambiaste `QWEN_TTS_API_KEY` en `.env`, usa el mismo valor en esta terminal.

```bash
if [ -f .env ]; then set -a; . ./.env; set +a; fi
QWEN_TTS_API_KEY="${QWEN_TTS_API_KEY:-local-demo-only}" PYTHONPATH=backend backend/.venv-mlx/bin/uvicorn app.qwen_tts_sidecar:app --host 0.0.0.0 --port 8001
```

La API del sintetizador requiere esa clave compartida. En equipos sin Apple Silicon se puede omitir este proceso; la sala informa que usará una voz del navegador sin clonar la muestra.

En **2. Sala de Llamadas**, cargá una grabación propia o autorizada y revisá la transcripción del recorte. Para una fuente de más de 12 segundos, escuchala y elegí inicio y fin de un tramo de 5–12 segundos; Whisper transcribe ese fragmento automáticamente. La sala 3D representa una conversación ficticia: Qwen3.5 genera el siguiente turno, Qwen3-TTS lo reproduce progresivamente y podés responder por texto, micrófono o con acciones defensivas. Al terminar, la devolución resume los indicios del guion y la respuesta del participante.

### Pesos del modelo de voz

La instalación usa el código oficial `f5-tts`. El fine-tune español y su vocabulario se descargan aparte porque los pesos no se versionan en Git. Después de instalar las dependencias, ejecute:

```bash
backend/.venv/bin/python scripts/download_f5_spanish.py
```

El checkpoint pesa aproximadamente 1.35 GB y queda en `backend/weights/f5-spanish`. El backend también descarga el vocoder oficial Vocos la primera vez que carga F5-TTS. Puede cargar una grabación fuente de hasta 10 minutos, escucharla y seleccionar manualmente un fragmento de 5–12 segundos. faster-whisper transcribe localmente ese recorte y su texto queda editable para corregirlo antes de generar. Consulte [`docs/investigacion-voz.md`](docs/investigacion-voz.md) para el análisis del artículo comparativo, KikiVoice, F5-TTS y las limitaciones de calidad y licencia.

El contenedor del backend usa PyTorch CPU, no MPS. F5-TTS puede tardar más dentro de Docker que en el entorno nativo de macOS. Para priorizar la referencia de F5-TTS, la demo parte de CFG 2, 32 pasos y velocidad 1.0; se pueden elegir 16, 24 o 48 pasos según el tiempo disponible. Reducir pasos puede reducir el tiempo y también afectar la salida; más pasos no garantizan una voz más parecida. La semilla fija por defecto permite repetir la entrada de ruido de muestreo en el mismo entorno; cambiarla permite probar otra variación. La app registra la semilla efectivamente usada. F5 recibe referencias de hasta 12 s y el backend limita la duración proyectada de cada inferencia a 30 s. La inferencia se ejecuta localmente cuando ya se descargaron los pesos.

La casilla de consentimiento es una declaración del operador: la aplicación no comprueba quién aparece en el audio ni si esa persona autorizó el uso. No se integra KikiVoice ni se envían referencias a servicios de clonación en la nube.

El generador A/B necesita Piper en `backend/.venv/bin/piper` y la voz española `es_ES-davefx-medium.onnx` en `backend/weights/piper/`; el repositorio no distribuye ese binario ni esos pesos. Si faltan, la preparación se omite y el catálogo informa que los WAV no están disponibles.

---

## 💻 Ejecución en otros sistemas

El flujo recomendado en macOS, Linux y Windows con Docker Desktop es `docker compose up --build`, siguiendo la puesta en marcha anterior. La sala 3D y el modelo de diálogo funcionan en los contenedores. La síntesis clonada con Qwen3-TTS/MLX requiere macOS con Apple Silicon y se inicia en una terminal aparte; en otros equipos se usa la voz española del navegador como alternativa.

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
