# VoiceShield Lab — Alcance y limitaciones

VoiceShield Lab es una prueba de concepto académica para estudiar generación autorizada de voz y señales defensivas en comunicaciones grabadas. No autentica hablantes, no decide por sí sola si una llamada es fraudulenta y no sustituye los controles de una organización.

## 1. Qué clasifica el detector acústico

- El adaptador actual ejecuta un baseline espectro-acústico propio de VoiceShield. Si se instala un checkpoint compatible con la arquitectura experimental del repositorio, usa ese prototipo neuronal. Ninguna ruta equivale al modelo oficial preentrenado AASIST.
- Sus scores son valores exploratorios sin calibración probabilística. No deben expresarse como porcentaje de certeza sobre síntesis, fraude o identidad.
- El resultado «compatible con voz humana» no autentica a la persona y no descarta edición o clonación. «Compatible con síntesis» tampoco prueba una intención maliciosa.
- Los umbrales son heurísticos y no se han validado sobre una población o corpus amplio. Ruido, reverberación, códecs, idioma, acento y duración pueden cambiar el resultado.

## 2. Marcas de procedencia

- Si `PerthNet` está instalado, el adaptador lo usa; si no, usa una firma spread-spectrum experimental propia de VoiceShield. La interfaz y la API indican qué método ejecutaron.
- La firma no autentica al hablante, no demuestra intención y puede degradarse, eliminarse, copiarse o detectarse por error. Su ausencia no demuestra origen humano.
- La ruta de respaldo no debe presentarse como una implementación oficial de PerTh. La audibilidad de la marca no se certifica mediante una prueba perceptual formal.

## 3. Transcripción y análisis semántico

- faster-whisper genera texto localmente. Errores de transcripción, ruido, acento, contexto incompleto o separación de hablantes afectan la revisión posterior.
- Gemma 3 en Ollama analiza ocho factores si el modelo está disponible. Sin Ollama se ejecuta un motor heurístico por reglas, de menor alcance. La respuesta identifica cuál de los dos motores se usó.
- El score semántico es una salida del modelo o una suma heurística; no está calibrado como probabilidad de vishing. Las citas y etiquetas requieren revisión humana.
- La transcripción se trata como evidencia no confiable frente a instrucciones incrustadas; esa separación reduce riesgos de inyección, pero no garantiza eliminar todos los errores del modelo.

## 4. Identidad y decisión operativa

- La casilla de verificación fuera de banda registra lo que declara el operador. VoiceShield no realiza llamadas, consulta directorios ni comprueba que la verificación haya ocurrido.
- Una solicitud de OTP, contraseña, token o transferencia activa el protocolo de cautela aunque la voz parezca humana, sintética o indeterminada.
- Una voz sintética con contenido benigno no se clasifica como fraude solo por ser sintética. Del mismo modo, una voz humana no garantiza legitimidad.
- La matriz combina evidencia exploratoria; su nivel operativo es orientativo y no sustituye el procedimiento de respuesta de una institución.

## 5. Escenarios y validez experimental

- A/B son guiones ficticios sintetizados con Piper. No representan una clonación de los participantes del laboratorio.
- C/D requieren grabaciones humanas aportadas con autorización y la lectura del guion correspondiente. El manifiesto registra la declaración del operador, pero el sistema no puede probar automáticamente que el audio sea una voz humana o que exista consentimiento.
- El generador ya no crea muestras C/D con TTS. Sin una fuente C/D válida en `scenario_provenance.json`, el catálogo no ofrece esos WAV como muestras etiquetadas y el benchmark responde que faltan fuentes.
- El catálogo disponible contiene dos casos sintéticos maliciosos, un control humano legítimo y un caso de vishing humano. Falta el cuadrante sintético legítimo; el control puede prepararse durante la demo con una referencia autorizada.
- El benchmark compara una única muestra C y una única muestra A en cuatro transformaciones. Las ocho variantes derivan de dos grabaciones y no son ocho hablantes independientes. Las métricas y la curva de EER son exploratorias, no estimaciones de producción ni una validación independiente del detector.
- Las transformaciones FFmpeg miden las salidas de esa ejecución. No se afirma por anticipado que un filtro concreto degrade el clasificador.

## 6. Generación de voz y autorización

- F5-TTS usa una referencia de voz breve y una transcripción revisada. La calidad, el parecido, la prosodia y el tiempo dependen de la muestra, el texto, los parámetros y el hardware; igualar F₀ no garantiza similitud de identidad ni naturalidad.
- La interfaz solicita autorización y el backend rechaza solicitudes sin la confirmación enviada por el cliente. Es una declaración del operador, no verificación legal o biométrica.
- La política del proyecto limita el uso a voces propias o consentidas y guiones académicos. No hay verificación automática para impedir una suplantación o detectar una figura pública.

## 7. Limpieza y retención local

- La acción de limpieza elimina archivos de `uploads`, derivados en `experiments`, WAV generados `synth_*.wav`, grabaciones C/D registradas como humanas y filas de audio, análisis y experimentos en SQLite. Conserva las muestras sintéticas A/B y el código.
- El endpoint informa el alcance de la operación, pero el borrado ordinario del sistema de archivos no garantiza eliminación forense de bloques, copias de seguridad o almacenamiento sincronizado.
- Los informes JSON descargados desde el navegador quedan fuera del control del servidor y deben borrarse por separado.
- Los modelos descargados (F5-TTS, Ollama, faster-whisper, PerthNet/Piper) se guardan en cachés o directorios de pesos; la limpieza de sesión no los elimina.

## 8. Lectura recomendada para la defensa

Presentar los resultados como evidencia del prototipo y describir los datos concretos utilizados. Separar cuatro preguntas: qué rasgos acústicos se midieron, qué firma se buscó, qué dice la transcripción y qué verificación registró el operador. Para acciones sensibles, pausar y usar un canal institucional independiente; la salida del laboratorio no es autenticación.
