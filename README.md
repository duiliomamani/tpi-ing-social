# VoiceShield Lab 🛡️

**Laboratorio de generación autorizada de voz y análisis de audio**

*Generación de voz autorizada, detección acústica y análisis de riesgo en comunicaciones.*
Trabajo Práctico Integrador / TPI — Licenciatura en Seguridad Informática.

---

## 📋 Resumen del Proyecto

**VoiceShield Lab** es una Proof of Concept (PoC) académica para experimentar con la generación autorizada de voz y evaluar audios desde varias capas:

1. **Generación:** Síntesis local en español con **Qwen3-TTS 0.6B**, condicionada por una referencia cuya autorización declara el operador y su transcripción revisada.
2. **Análisis de Audio:** Evaluación de muestras propias y audios de referencia con detección acústica, marcas de procedencia y experimentos de robustez.
3. **Evaluación Multicapa:** Panel de análisis en 4 dimensiones:
   - **Dimensión A (Acústica):** Baseline experimental de VoiceShield; no es la implementación oficial ni un checkpoint preentrenado de AASIST. Sus scores no están calibrados.
   - **Dimensión B (Procedencia):** PerthNet si está instalado; si no, una firma spread-spectrum experimental propia. La detección no acredita identidad, intención ni origen por sí sola.
   - **Dimensión C (Ingeniería Social):** Transcripción con **faster-whisper** y evaluación de 8 factores con **Qwen3.5:2B (Ollama)** o un motor heurístico local de respaldo. El score semántico tampoco es una probabilidad calibrada.
   - **Dimensión D (Verificación Out-of-Band):** Registro manual del operador. La aplicación no llama al contacto ni autentica su identidad.
4. **Laboratorio Comparativo:** Experimento exploratorio con **FFmpeg** sobre dos audios fuente y cuatro condiciones. Reporta las mediciones observadas; no presupone degradación ni estima el desempeño en producción.
5. **Simulación de llamadas:** Sala 3D local con **Qwen3.5:2B** para generar el diálogo y analizar sus señales, y **Qwen3-TTS Base 0.6B** para sintetizarlo desde una muestra autorizada. Se puede definir un contexto ficticio de hasta 600 caracteres con el rol, la institución, el motivo y el pedido; el backend elimina datos numéricos y de contacto comunes y el modelo no genera pasos operativos de pago. El participante responde por texto o micrófono; faster-whisper transcribe localmente. No se realizan llamadas telefónicas.
6. **Modo Exposición Universitaria:** Guía interactiva paso a paso para la defensa oral del proyecto.

---

## 🏗️ Arquitectura del Sistema

```
tpi-ing-social/
├── backend/
│   ├── Dockerfile             # API FastAPI con PyTorch CPU
│   ├── Dockerfile.qwen-tts    # Servicio Qwen3-TTS con PyTorch CPU
│   ├── .dockerignore
│   ├── app/
│   │   ├── adapters/          # Interfaces y adaptadores desacoplados
│   │   │   ├── aasist_adapter.py      # Baseline acústico experimental de VoiceShield
│   │   │   ├── qwen_tts_adapter.py    # Qwen3-TTS local condicionado por audio y transcripción
│   │   │   ├── qwen_llm_adapter.py     # Qwen3.5 local en Ollama + fallback heurístico
│   │   │   ├── perth_adapter.py       # PerthNet opcional + firma experimental de respaldo
│   │   │   └── whisper_adapter.py     # faster-whisper en español
│   │   ├── api/routers/       # Endpoints REST y WebSocket (FastAPI)
│   │   │   └── call_simulation.py     # Turnos y acciones de la sala local
│   │   ├── qwen_tts_service.py        # Servicio de síntesis Qwen3-TTS
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
│   └── requirements-qwen-tts.txt  # Dependencias del servicio Qwen3-TTS
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
│   └── setup_environment.sh      # Preparación opcional para desarrollo nativo
├── compose.yaml                 # Frontend, API, Ollama, Qwen3-TTS y modelos
├── .env.example                 # Configuración local de servicios
├── LIMITATIONS.md             # Documentación exhaustiva de limitaciones
└── README.md
```

---

## ⚡ Requisitos del Sistema

- **Docker Desktop** con Docker Compose v2.
- **Diálogo:** Qwen3.5:2B en Ollama, dentro de Docker Compose.
- **Clonación de voz:** Qwen3-TTS Base 0.6B usa PyTorch CPU en un contenedor de Compose. Es la configuración portable para macOS, Linux y Windows con Docker Desktop; la inferencia por CPU puede tardar más que en un equipo con aceleración compatible.

---

## 🚀 Instalación y Puesta en Marcha

### 1. Clonar el Repositorio
```bash
git clone https://github.com/duiliomamani/tpi-ing-social.git
cd tpi-ing-social
```

### 2. Iniciar la Aplicación

Levanta el frontend, el backend, Ollama y el servicio Qwen3-TTS. La primera vez, Docker descarga Qwen3.5:2B en `ollama_data`; Qwen3-TTS descarga sus pesos al solicitar la primera síntesis y los conserva en `huggingface_cache`.

```bash
cp .env.example .env
docker compose up --build
```
Una vez iniciado:
- **Frontend Web:** Abre en [http://localhost:3002](http://localhost:3002)
- **Backend API & Swagger:** Abre en [http://localhost:8003/docs](http://localhost:8003/docs)

Los puertos publicados por defecto son `3002` y `8003` para convivir con servicios comunes que ya usan `3000` y `8000`. Se pueden cambiar con `VOICESHIELD_FRONTEND_PORT` y `VOICESHIELD_API_PORT` en `.env`; si cambiás el puerto de API, reconstruí frontend y backend con `docker compose up --build`.

Los contenedores de frontend y backend se construyen para producción. Ollama genera el diálogo; Qwen3-TTS sintetiza y clona la voz mediante su propio servicio PyTorch CPU. Los dos modelos usan volúmenes persistentes y no se agregan a Git. Las cargas y resultados permanecen en `backend/data`.

Para detener los servicios, presioná `Ctrl+C` en esa terminal. Para detener y retirar los contenedores, ejecutá `docker compose down`; los pesos descargados y los datos locales se conservan.

### Presentación independiente

Para mostrar únicamente la presentación interactiva, sin iniciar backend, Ollama ni sintetizador, ejecutá `./presentacion.sh` desde la raíz (o `npm run presentacion` desde `frontend/`). Abre la página estática en el navegador y sirve el contenido solo en `127.0.0.1`; `Ctrl+C` detiene el servidor.

### Servicio de clonación Qwen3-TTS

Ollama usa Qwen3.5:2B para redactar y analizar el diálogo. Qwen3-TTS es otro modelo y se ejecuta en el contenedor `qwen-tts`, con el paquete oficial `qwen-tts` y PyTorch CPU. Compose conecta el backend y el sintetizador por la red interna; no hay un proceso MLX en el host ni se usa `host.docker.internal`.

La imagen puede correr en macOS, Linux y Windows con Docker. La primera síntesis descarga `Qwen/Qwen3-TTS-12Hz-0.6B-Base` desde Hugging Face; los pesos quedan en el volumen `huggingface_cache`. Las generaciones se ejecutan en CPU y pueden tardar más que en un runtime acelerado. Ajustá `QWEN_TTS_CPU_THREADS` para limitar los hilos de CPU (por defecto, 4) o `QWEN_TTS_MODEL` para elegir otro checkpoint compatible.

```bash
docker compose up --build
```

La clave compartida `QWEN_TTS_API_KEY` autentica las solicitudes internas del backend al sintetizador. El puerto 8001 no se publica en el host.

En **2. Sala de Llamadas**, escribí un contexto ficticio —por ejemplo, quién llama, a quién, por qué y qué solicita— y cargá una grabación propia o autorizada. El botón **Usar ejemplo** repone el sorteo de MerchPay; también podés crear otro escenario, como el presidente de un club ficticio que llama a sus socios por una transferencia vinculada a un pase. Qwen presenta el rol, el motivo y el pedido, varía la redacción y adapta los turnos siguientes a tus respuestas. El objetivo didáctico queda como contexto y no se pronuncia. Revisá la transcripción del recorte. Para una fuente de más de 12 segundos, escuchala y elegí inicio y fin de un tramo de 5–12 segundos; Whisper transcribe ese fragmento automáticamente. Qwen3.5 analiza las señales y Qwen3-TTS sintetiza cada turno completo para reproducirlo con claridad. Podés responder por texto, micrófono o acciones defensivas. La sala es local: no hace llamadas ni procesa transferencias. Al terminar, la devolución resume los indicios del guion y la respuesta del participante.

### Generación de voz con Qwen3-TTS

La pestaña de generación y la sala de llamadas usan Qwen3-TTS Base 0.6B con PyTorch CPU en el servicio `qwen-tts` de Docker Compose. Ollama genera texto con Qwen3.5:2B; no sirve el modelo de clonación. El paquete oficial expone generación por voz de referencia mediante `ref_audio` y su transcripción `ref_text`. La referencia y la transcripción se procesan localmente y no se envían a un proveedor externo. La API limita el texto nuevo a 400 caracteres y la transcripción de referencia a 800.

Podés cargar una grabación fuente de hasta 10 minutos, escucharla y seleccionar manualmente un fragmento de 5–12 segundos. faster-whisper transcribe localmente ese recorte y el texto queda editable antes de generar. Qwen condiciona la voz con el audio y la transcripción; no aplica un bloqueo fijo de frecuencia fundamental. La similitud y naturalidad deben evaluarse escuchando la salida. El tiempo de generación depende del hardware y la longitud del texto.

La casilla de consentimiento es una declaración del operador: la aplicación no comprueba quién aparece en el audio ni si esa persona autorizó el uso.

El generador A/B necesita Piper en `backend/.venv/bin/piper` y la voz española `es_ES-davefx-medium.onnx` en `backend/weights/piper/`; el repositorio no distribuye ese binario ni esos pesos. Si faltan, la preparación se omite y el catálogo informa que los WAV no están disponibles.

---

## 💻 Ejecución en otros sistemas

El flujo recomendado en macOS, Linux y Windows con Docker Desktop es `docker compose up --build`. La sala 3D, la API, Ollama/Qwen3.5:2B y Qwen3-TTS/PyTorch CPU se ejecutan en contenedores. El perfil CPU evita depender de Apple Silicon, CUDA o una GPU específica; a cambio, la síntesis puede ser lenta. Los pesos se descargan una vez y quedan en el volumen `huggingface_cache`.

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

La suite de `backend/tests/test_backend.py` verifica el catálogo y los contratos del detector, la marca, el análisis semántico y el benchmark sobre audios temporales. El benchmark requiere FFmpeg. No ejecuta la síntesis de voz ni descarga modelos:
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
