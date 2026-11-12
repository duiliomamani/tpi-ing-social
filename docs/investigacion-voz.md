# Investigación de TTS y clonación de voz

**Revisado:** 11 de noviembre de 2026

## Hallazgo en VoiceShield Lab

La ruta anterior generaba primero el texto con Piper y después aplicaba `ChatterboxVC`, un modelo de conversión de voz. La entrada de esa conversión ya tenía la prosodia de una voz artificial. El ajuste global de F₀ y el filtro LTAS añadían procesamiento posterior, pero no convertían esa ruta en TTS condicionado por texto y podían alterar la naturalidad.

La ruta principal ahora llama a `ChatterboxMultilingualTTS.generate(text, language_id="es", audio_prompt_path=...)` directamente con la referencia. Conserva la entonación que produce el modelo, mide F₀ solo como diagnóstico y evita volver a incrustar PerTh cuando el propio TTS ya lo incorporó. Los pesos locales encontrados en este entorno son **Chatterbox Multilingual V2**; el código ya no los presenta como V3. Piper queda como respaldo identificado en los metadatos y no se describe como clonación de la muestra.

## KikiVoice

La página pública presenta tres opciones (Kiki Core, Pro y Multilingual), clonación a partir de 3–15 segundos de habla limpia, ajuste de idioma, altura, velocidad y emoción, y soporte anunciado de más de 75 idiomas. Esas características ayudan a explicar por qué los ejemplos pueden sonar expresivos; la página no identifica los checkpoints, arquitectura, método de inferencia ni una evaluación independiente de calidad. Por eso, las cifras y etiquetas de realismo del sitio deben tratarse como afirmaciones del proveedor, no como resultados verificados.

La FAQ indica que **no ofrece API actualmente**, así que no hay una integración soportada para el backend local. Sí puede servir como referencia para una comparación manual y privada con el mismo texto y audio, seleccionando Core/Pro/Multilingual. La página informa una cuota gratuita semanal; los términos requieren atribución para publicar resultados generados con el nivel gratuito.

KikiVoice procesa el audio en la nube. Su política afirma que no usa los audios ni las representaciones de voz para entrenar modelos; la retención depende de la función y del vencimiento mostrado, y cerrar la sesión no elimina inmediatamente todos los datos. La política permite solicitar borrado y contempla copias de respaldo y retención legal limitada. No cargar una muestra de voz allí sin autorización específica para ese procesamiento externo.

Fuentes del proveedor:

- [Página de KikiVoice en español](https://kikivoice.ai/es)
- [FAQ: controles, formatos, API y tratamiento de datos](https://kikivoice.ai/faq)
- [Política de privacidad](https://kikivoice.ai/privacy)
- [Términos de servicio y atribución del plan gratuito](https://kikivoice.ai/terms-of-service)

## Alternativas locales

| Opción | Encaje con el proyecto | Límites observados |
| --- | --- | --- |
| Chatterbox Multilingual TTS | El proyecto ya tiene el paquete y los pesos V2. La API oficial genera desde texto y acepta una referencia; el modelo multilingüe incluye español. Es el cambio de menor alcance para corregir la arquitectura actual. | El V3 anuncia más similitud y naturalidad, y hay un ajuste de español latinoamericano, pero los pesos V3 no están en este checkout. El ajuste latinoamericano publicado está etiquetado `es-419 / es-MX`, así que habría que evaluar cómo conserva un acento rioplatense. El upstream anunció que el proyecto quedó archivado y sin mantenimiento en agosto de 2026. |
| F5-TTS español | El modelo comunitario de español se presenta como fine-tune para síntesis en español y ofrece clonación zero-shot mediante una referencia. Puede ser una segunda comparación local. | Los metadatos del modelo en Hugging Face indican `CC-BY-NC-4.0`, mientras que el texto de su tarjeta afirma CC0. Conviene aclarar esa discrepancia de licencia antes de adoptarlo o redistribuirlo. |

Fuentes de los proyectos:

- [Chatterbox: TTS multilingüe, uso con `audio_prompt_path` y estado del upstream](https://github.com/resemble-ai/chatterbox)
- [Modelo Chatterbox de español latinoamericano](https://huggingface.co/ResembleAI/Chatterbox-Multilingual-es-mx-latam)
- [F5-TTS: modelos compartidos y fine-tune español](https://github.com/SWivid/F5-TTS/blob/main/src/f5_tts/infer/SHARED.md)
- [Tarjeta y metadatos de F5-Spanish](https://huggingface.co/jpgallegoar/F5-Spanish)

## Cómo comparar sin sesgo

Para una comparación válida, generar el mismo texto con la misma muestra clara, controlar el idioma/acento y comparar las salidas sin normalizarlas de manera diferente. Conviene escuchar las versiones a ciegas y registrar preferencia, inteligibilidad y similitud percibida por separado. La mediana de F₀ puede acompañar el registro, pero no debe usarse como objetivo exacto: dos voces naturales pueden compartir F₀ mediano y sonar distintas, y forzar una frecuencia puede quitar variación expresiva.

La comparación con KikiVoice es manual porque no publica API. Los audios de voz contienen información identificable; la prueba en un servicio externo requiere decidir aparte si se acepta ese procesamiento en la nube.
