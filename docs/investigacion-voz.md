# Investigación de clonación de voz

**Revisado:** 14 de noviembre de 2026

## Lectura del artículo de Rare Build Software

El artículo compara seis modelos con una PC Windows (Ryzen 7 5800X, 32 GB de RAM y RTX 3060 de 12 GB). El autor usó una muestra propia de 60 segundos y cinco textos: tres en inglés, uno en español y uno en mandarín. Su escucha favorece F5-TTS en inglés, especialmente en frases largas, donde reporta pausas y prosodia más naturales. También estima unos cuatro segundos por frase y afirma que necesitó un checkpoint reducido para caber en 12 GB de VRAM.

Es un indicio útil para elegir qué probar, pero no demuestra que F5-TTS sea el más realista en español o con una voz argentina. La evaluación es una escucha subjetiva de una sola persona; no reporta prueba ciega, MOS, similitud de hablante ni resultados separados para esa única frase española. El propio artículo reconoce que ponderó la escucha por encima de métricas rigurosas. Además, el autor declara que desarrolla RBS Voice Cloner V2, el empaquetado de XTTS v2 que recomienda como la opción más fácil. Esa relación comercial no invalida sus observaciones, pero conviene tenerla presente al leer la clasificación.

Hay dos detalles que no se deben tomar como datos universales. Los tiempos y la memoria reportados corresponden a su RTX 3060 y a los checkpoints que eligió; no predicen el rendimiento de otra computadora. Y la fecha que atribuye al lanzamiento de F5-TTS no coincide con el historial oficial, que registra los modelos base en octubre de 2024 y F5-TTS v1 en marzo de 2025.

El resto de la tabla del artículo asigna a XTTS v2 facilidad de instalación, baja memoria y 17 idiomas; a IndexTTS-2, mandarín y japonés; a Chatterbox, facilidad para demos; a Fish Speech, diálogo multi-voz; y a CosyVoice 2, control explícito de emoción. Son impresiones del mismo experimento pequeño. No demuestra que esos modelos sean mejores en español, y varias ventajas (instalación, diálogo multi-voz o controles de emoción) son distintas de la prioridad de este laboratorio: similitud vocal en español con inferencia local.

| Modelo | Lo que sostiene el artículo | Lectura para este proyecto |
| --- | --- | --- |
| F5-TTS | Mejor prosodia larga en inglés; naturalidad de pausas. | Candidato elegido; debemos medir español y similitud con nuestra voz. |
| XTTS v2 / RBS | Fácil de instalar, ligero y con cobertura multilingüe. | Alternativa si el hardware/tiempo de instalación pesa más; el empaquetado recomendado pertenece al autor. |
| IndexTTS-2 | Mejor en mandarín y japonés. | El artículo no aporta evidencia de ventaja en español. |
| Chatterbox | Fácil para demos y competitivo en clips cortos. | Menos indicado según el artículo para narración larga; no es el motor que conectamos. |
| Fish Speech V1.5 | Diálogo con varios hablantes. | Útil para escenas multi-voz, fuera del objetivo principal de una sola identidad. |
| CosyVoice 2 | Etiquetas explícitas de emoción. | Interesante para actuación emocional; no se evaluó su resultado en español. |

**Decisión para VoiceShield Lab:** probar F5-TTS tiene sentido porque este proyecto integra el modelo en una aplicación y el artículo destaca su prosodia en texto largo. Para español usaremos el código oficial de F5-TTS con el fine-tune comunitario F5-Spanish; la calidad con la voz y el acento del titular se debe evaluar escuchando las salidas del propio laboratorio. El fine-tune declara datos de varias regiones, incluido español argentino, pero eso no garantiza por sí solo que reproduzca el acento rioplatense del titular.

## F5-TTS en el laboratorio

El backend usa `F5TTS.infer()` del paquete oficial `f5-tts`, con una muestra autorizada (`ref_file`), su transcripción literal (`ref_text`) y el texto nuevo (`gen_text`). La interfaz expone los controles que soporta esa API: guía CFG, pasos de inferencia y velocidad. No aplica desplazamiento global de tono ni ecualización LTAS; las mediciones de F₀ son solo diagnósticas.

La generación de ejemplos del Dashboard es independiente de F5-TTS: A/B usan Piper como voces TTS sintéticas de guiones ficticios. C/D ya no se fabrican con Piper ni se etiquetan como humanos automáticamente; requieren grabaciones aportadas con autorización declarada y revisión manual de la transcripción. La app registra esa procedencia local, sin verificarla biométricamente. El estado del detector acústico y sus diferencias frente a la mención de AASIST en el informe se documentan en [`estado-poC-vs-informe.md`](estado-poC-vs-informe.md).

La referencia requiere transcripción porque el modelo compara el audio con las palabras indicadas. Se pueden cargar grabaciones fuente de hasta 10 minutos, escucharlas y marcar manualmente el inicio y el fin de un fragmento continuo de 5–12 segundos. faster-whisper transcribe ese recorte en CPU e int8; así se alinea el audio exacto con el texto enviado a F5 sin tener que transcribir la grabación completa. El clip y su transcripción quedan editables. La primera carga puede descargar el modelo al caché de Hugging Face; el audio permanece en el backend local. Revise el clip, nombres, palabras en otros idiomas y omisiones antes de generar.

El checkpoint español se descarga con `python scripts/download_f5_spanish.py` a `backend/weights/f5-spanish`; esos archivos están excluidos de Git. F5-TTS también descarga su vocoder Vocos la primera vez que inicializa el modelo. Si faltan pesos o dependencias, el backend informa que el motor no está disponible y no sustituye la clonación por una voz de Piper.

El artículo midió F5-TTS en una RTX 3060. En este Mac M1 con 16 GB, una generación reportó falta de memoria compartida (4,18 GB asignados a MPS y 16,71 GB en otras asignaciones). El sondeo de salud también creaba un nuevo AASIST en MPS y una nueva instancia de PerthNet en cada consulta, aumentando innecesariamente la presión de memoria. El endpoint ahora reutiliza los adaptadores cargados. El backend libera MPS y reintenta una vez en CPU ante un OOM; también acepta `F5_TTS_DEVICE=cpu` para iniciar directamente en CPU. La inferencia en CPU puede ser más lenta y requiere memoria RAM disponible.

El WAV de una demo duró 86,54 s aunque el texto objetivo era corto. La referencia cargada duraba 6 min 42 s y la transcripción ingresada era solo «Mercado Libre». F5-TTS recorta referencias largas a unos 12 s y estima la duración generada según la longitud de la referencia y del texto; por eso ambos deben cubrir exactamente el mismo fragmento. La carga permite fuentes de hasta 10 minutos y deja que el usuario seleccione manualmente el recorte de 5–12 s; solo ese tramo se transcribe antes de pasarlo a F5. La síntesis valida que la referencia corta coincida en duración y cantidad de voz con su transcripción, además de evitar inferencias simultáneas. El ajuste por defecto bajó de 32 a 16 pasos para la demo rápida; esto reduce cálculo con un posible coste de calidad. La API también estima la duración total según la fórmula que usa F5 y rechaza inferencias que superen 30 s, antes de comenzar el muestreo. Revise y corrija el recorte y su transcripción antes de usarlo.

## Licencias y datos

El código oficial de F5-TTS tiene licencia MIT; sus pesos publicados por el upstream tienen condiciones no comerciales CC-BY-NC. La ficha de Hugging Face para F5-Spanish también muestra `CC-BY-NC-4.0` en los metadatos, mientras que el texto del model card declara CC0-1.0. Ante esas contradicciones, el proyecto adopta la condición más restrictiva (uso no comercial) y no redistribuye los pesos. La ficha del modelo declara 218 horas de datos de español y enumera corpus de distintas regiones, incluidos Argentina, Chile, Colombia y Perú. Antes de cualquier uso comercial o redistribución, habría que aclarar la licencia con quien publicó el fine-tune y revisar las condiciones de los datos de entrenamiento.

La generación procesa la muestra en el backend local. No se envía la voz a KikiVoice ni a otro servicio externo. La marca de procedencia se intenta agregar después de F5-TTS mediante el adaptador PerTh del laboratorio; esa marca no forma parte del modelo F5 y su presencia no debe interpretarse como prueba infalible del origen.

## KikiVoice como referencia de producto

La página de clonación de KikiVoice ofrece controles de modelo, emoción, idioma/acento, velocidad, calidad y pausas, además de aceptar referencias cortas. La página no publica los pesos ni la arquitectura del motor, y su FAQ indica que no ofrece una API pública. Por eso no hay una forma soportada de incorporar ese mismo modelo al backend local; sí se puede comparar manualmente con permiso para procesar la muestra en la nube.

Las descripciones de realismo del proveedor son afirmaciones de producto, no una evaluación independiente. Una comparación justa debe usar el mismo texto y una muestra equivalente, escuchar sin saber qué sistema produjo cada archivo y puntuar por separado naturalidad, inteligibilidad y similitud de identidad.

## Protocolo sugerido para evaluar las salidas

1. Usar una muestra sin música ni voces de fondo y transcribir exactamente lo que se dice.
2. Generar las mismas frases cortas, narrativas y preguntas con F5-TTS y, si se decide aceptar el procesamiento en la nube, KikiVoice.
3. Mantener iguales los textos, las referencias y el volumen percibido; no cambiar el pitch ni aplicar filtros distintos entre motores.
4. Hacer una escucha A/B ciega y registrar por separado naturalidad, inteligibilidad y similitud de hablante.
5. Reportar F₀ mediana como dato acústico auxiliar, nunca como sustituto de similitud vocal.

## Fuentes

- [Artículo de Rare Build Software: Best Open-Source Voice Cloning Models in 2026](https://rarebuildsoftware.com/blog/best-open-source-voice-cloning-2026)
- [Repositorio oficial SWivid/F5-TTS](https://github.com/SWivid/F5-TTS)
- [API oficial `F5TTS.infer`](https://raw.githubusercontent.com/SWivid/F5-TTS/main/src/f5_tts/api.py)
- [F5-Spanish: ficha del modelo y datasets](https://huggingface.co/jpgallegoar/F5-Spanish)
- [Clonación de voz KikiVoice](https://kikivoice.ai/ai-voice-cloning/es)
- [FAQ de KikiVoice](https://kikivoice.ai/faq)
- [Privacidad de KikiVoice](https://kikivoice.ai/privacy)
