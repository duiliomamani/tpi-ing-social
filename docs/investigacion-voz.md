# Clonación de voz local con Qwen3-TTS

## Motor integrado

VoiceShield Lab usa Qwen3-TTS Base 0.6B cuantizado a 8 bits mediante MLX/Metal. El servicio de síntesis corre localmente en macOS con Apple Silicon. La pestaña de Generación y la sala de llamadas utilizan el mismo motor y el mismo servicio local; Ollama/Qwen3.5 redacta los turnos de la simulación, mientras Qwen3-TTS los convierte en audio.

La síntesis se condiciona con un recorte de audio autorizado y su transcripción revisada. La aplicación permite cargar una grabación fuente de hasta 10 minutos, seleccionar un tramo continuo de 5–12 segundos y transcribir ese recorte localmente con faster-whisper. El audio y el texto permanecen editables antes de sintetizar. La API limita el texto nuevo a 400 caracteres y la transcripción de referencia a 800.

El modelo usa la muestra y el texto para orientar la voz, pero no aplica un bloqueo fijo de frecuencia fundamental. No se debe interpretar una coincidencia de tono como prueba de similitud de identidad. La naturalidad, inteligibilidad y parecido deben evaluarse escuchando las salidas con una comparación controlada; la duración de la inferencia depende del equipo y del texto. No se envía la referencia a un proveedor de clonación en la nube.

La marca de procedencia del laboratorio se puede aplicar después de la síntesis con el adaptador disponible. No es una función propia del modelo ni prueba infalible del origen. La casilla de autorización registra una declaración del operador; no verifica la identidad de la voz ni el consentimiento por medios biométricos o legales.

## Servicio local y contenedores

En Docker Compose, frontend, API y Ollama corren en contenedores. Qwen3-TTS/MLX se ejecuta como proceso nativo de macOS porque Docker Desktop no da acceso a Metal desde el contenedor Linux. La API envía los bytes del recorte al servicio local autenticado, por lo que no hace falta compartir una ruta de archivos entre ambos procesos.

El servicio conserva un trabajador persistente para mantener el contexto requerido por MLX. La salida se reproduce cuando el turno completo está listo; este flujo evita cortes entre fragmentos y prioriza un diálogo claro. La transmisión por fragmentos puede reducir la espera inicial en otros modos, pero no elimina el tiempo de inferencia previo al primer audio.

Si el sintetizador local no está disponible, la interfaz informa el error. La voz española del navegador es una alternativa de lectura y no clona la muestra.

## Sala de simulación de llamadas

La sala es una conversación ficticia dentro del laboratorio; no realiza llamadas telefónicas ni contacta a terceros. La interfaz acepta un contexto de escenario de hasta 600 caracteres y ofrece como ejemplo un supuesto premio que requiere una transferencia. Ollama ejecuta `qwen3.5:2b` para generar los turnos y analizar el texto de la llamada; Qwen3-TTS genera la voz a partir de la referencia autorizada. El prompt se trata como contexto no confiable. El servidor limita su longitud y elimina números largos, enlaces y algunos identificadores financieros; las instrucciones del sistema prohíben producir cuentas, montos, destinos o pasos de pago. El participante responde por texto, micrófono o acciones defensivas. La devolución final identifica señales del guion y decisiones tomadas durante el ejercicio.

## Evaluación

Para comparar versiones o configuraciones, usar la misma referencia y los mismos textos, revisar la transcripción, normalizar el volumen percibido y escuchar los audios en orden aleatorio sin ver qué configuración produjo cada uno. Puntuar por separado naturalidad, inteligibilidad, prosodia y similitud percibida. Registrar el hardware, la versión del modelo, la longitud del texto y el tiempo medido. Estos resultados describen esa prueba y ese equipo; no son una garantía general de rendimiento.

La generación de ejemplos A/B del Dashboard es independiente del clonador: usa Piper para guiones ficticios. Las grabaciones C/D requieren muestras aportadas con autorización declarada y revisión manual de la transcripción. La app registra esa procedencia local, sin verificarla biométricamente. Las limitaciones del detector acústico y su diferencia frente a la mención de AASIST en el informe se describen en [`estado-poC-vs-informe.md`](estado-poC-vs-informe.md).

## Referencias

- [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS)
- [MLX-Audio: clonación y streaming de Qwen3-TTS](https://github.com/Blaizzy/mlx-audio/blob/main/mlx_audio/tts/models/qwen3_tts/README.md)
- [Clonación de voz KikiVoice](https://kikivoice.ai/ai-voice-cloning/es)
- [FAQ de KikiVoice](https://kikivoice.ai/faq)
- [Privacidad de KikiVoice](https://kikivoice.ai/privacy)
