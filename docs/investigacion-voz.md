# Clonación de voz local con Qwen3-TTS

## Motor integrado

VoiceShield Lab usa Qwen3-TTS Base 0.6B mediante el paquete oficial `qwen-tts` y PyTorch CPU en un contenedor Docker. La pestaña de Generación y la sala de llamadas utilizan el mismo motor; Ollama/Qwen3.5 redacta los turnos de la simulación y Qwen3-TTS los convierte en audio.

La síntesis se condiciona con un recorte de audio autorizado y su transcripción revisada. La aplicación permite cargar una grabación fuente de hasta 10 minutos, seleccionar un tramo continuo de 5–12 segundos y transcribir ese recorte localmente con faster-whisper. El audio y el texto permanecen editables antes de sintetizar. La API limita el texto nuevo a 400 caracteres y la transcripción de referencia a 800.

El modelo usa la muestra y el texto para orientar la voz, pero no aplica un bloqueo fijo de frecuencia fundamental. No se debe interpretar una coincidencia de tono como prueba de similitud de identidad. La naturalidad, inteligibilidad y parecido deben evaluarse escuchando las salidas con una comparación controlada; la duración de la inferencia depende del equipo y del texto. No se envía la referencia a un proveedor de clonación en la nube.

La marca de procedencia del laboratorio se puede aplicar después de la síntesis con el adaptador disponible. No es una función propia del modelo ni prueba infalible del origen. La casilla de autorización registra una declaración del operador; no verifica la identidad de la voz ni el consentimiento por medios biométricos o legales.

## Servicio local y contenedores

Docker Compose levanta frontend, API, Ollama y el servicio `qwen-tts`. Ollama carga Qwen3.5:2B para el diálogo; el contenedor PyTorch carga `Qwen/Qwen3-TTS-12Hz-0.6B-Base` para la clonación. Son servicios separados porque Ollama en esta configuración no ejecuta el modelo Qwen3-TTS de voz de referencia. La comunicación backend-sintetizador usa la red interna de Compose y una clave compartida. El runtime CPU es común a macOS, Linux y Windows con Docker, sin depender de MLX/Metal o CUDA. Los pesos se descargan en el primer uso y persisten en el volumen `huggingface_cache`.

El servicio conserva el modelo en memoria después de cargarlo. La API entrega cada audio completo cuando termina la inferencia y la sala lo reproduce como un turno continuo; el uso de CPU puede alargar la espera, especialmente en la primera generación.

Si el sintetizador local no está disponible, la interfaz informa el error. La voz española del navegador es una alternativa de lectura y no clona la muestra.

## Sala de simulación de llamadas

La sala es una conversación ficticia dentro del laboratorio; no realiza llamadas telefónicas ni contacta a terceros. La interfaz acepta un contexto de escenario de hasta 600 caracteres y ofrece como ejemplo un supuesto premio que requiere una transferencia. El operador puede reemplazarlo por otro caso ficticio con su rol, institución, audiencia, motivo y pedido. En la primera intervención, Ollama/Qwen3.5 presenta esos elementos; los turnos posteriores sostienen el pedido y se adaptan a las respuestas del participante. El objetivo didáctico del contexto no se pronuncia. Qwen3-TTS genera la voz a partir de la referencia autorizada. El prompt se trata como contexto no confiable. El servidor limita su longitud y filtra contactos, enlaces, números largos e identificadores financieros comunes; si Qwen agrega datos o detalles operativos que no están permitidos, se genera una respuesta de respaldo coherente con el escenario. El participante responde por texto, micrófono o acciones defensivas. La devolución final identifica señales del guion y decisiones tomadas durante el ejercicio.

## Evaluación

Para comparar versiones o configuraciones, usar la misma referencia y los mismos textos, revisar la transcripción, normalizar el volumen percibido y escuchar los audios en orden aleatorio sin ver qué configuración produjo cada uno. Puntuar por separado naturalidad, inteligibilidad, prosodia y similitud percibida. Registrar el hardware, la versión del modelo, la longitud del texto y el tiempo medido. Estos resultados describen esa prueba y ese equipo; no son una garantía general de rendimiento.

La generación de ejemplos A/B del Dashboard es independiente del clonador: usa Piper para guiones ficticios. Las grabaciones C/D requieren muestras aportadas con autorización declarada y revisión manual de la transcripción. La app registra esa procedencia local, sin verificarla biométricamente. Las limitaciones del detector acústico y su diferencia frente a la mención de AASIST en el informe se describen en [`estado-poC-vs-informe.md`](estado-poC-vs-informe.md).

## Referencias

- [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS)
- [Clonación de voz KikiVoice](https://kikivoice.ai/ai-voice-cloning/es)
- [FAQ de KikiVoice](https://kikivoice.ai/faq)
- [Privacidad de KikiVoice](https://kikivoice.ai/privacy)
