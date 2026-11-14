# Alineación entre el informe y VoiceShield Lab

**Documento de referencia:** [TP Integrador VoiceShield Lab — Informe v2](https://docs.google.com/document/d/1BAisskl_MZv2ThaYACZxMtLQ-Az54rmStRi8mk_vtUA/edit)

Este archivo describe cómo debe leerse el repositorio frente al informe presentado. La aplicación se ajustó para no atribuirle capacidades que el código o los datos disponibles no acreditan.

## Correspondencia actual

| Tema del informe | Estado en el repositorio | Lectura para la demostración |
| --- | --- | --- |
| Generación local de voz | F5-TTS en español con referencia breve y transcripción editable. | La interfaz solicita autorización; es una declaración del operador. F₀ se informa como medición y no se fija para prometer una copia exacta. |
| AASIST | El adaptador disponible es un baseline acústico experimental propio; el código no integra la arquitectura/checkpoint upstream AASIST. | Presentar el motor por el nombre que devuelve la interfaz. No reportar sus salidas como resultados de AASIST. |
| PerTh / marca de procedencia | PerthNet se usa si está instalado. En su ausencia funciona una marca spread-spectrum experimental de VoiceShield. | La detección reporta la firma consultada; no prueba identidad, intención ni origen por sí sola. |
| Análisis semántico | Gemma 3 en Ollama si está disponible; de lo contrario, reglas heurísticas locales. | Revisar el campo `analyzer_engine` antes de explicar resultados; ambos motores tienen capacidades distintas. |
| Verificación fuera de banda | Casilla manual en la evaluación. | Solo registra lo que indica el operador. La aplicación no llama ni comprueba el canal alternativo. |
| Casos de audio A–D | A/B son voces TTS sintéticas de guiones ficticios. C/D requieren fuentes humanas consentidas aportadas por el operador. | La preparación valida manifiesto y WAV; la declaración de voz humana y consentimiento no se verifica automáticamente. |
| Matriz de escenarios | Hay dos combinaciones de intención × tipo de voz en los guiones existentes: sintética maliciosa y humana legítima/maliciosa. Falta sintética legítima. | Crear un control sintético benigno desde Generación de Voz para ilustrar que síntesis no implica fraude; documentarlo como control de sesión, no como muestra validada del catálogo. |
| Benchmark acústico | Una fuente A y una C; cuatro transformaciones por fuente; métricas sobre ocho variantes derivadas. | Es un experimento exploratorio. Reportar valores observados, declarar fuente y detector, no generalizar a población ni a producción. |
| Política ética | Casillas y guías operativas, sin prueba de identidad o consentimiento. | Usar solo voz propia o consentida y material académico ficticio. Las restricciones sobre figuras públicas son una política de uso, no un bloqueo técnico. |
| Limpieza | Se borran cargas, clones de sesión, derivados experimentales, C/D humanas registradas y filas de SQLite. | A/B sintéticas y pesos quedan. La limpieza no elimina JSON ya descargados ni garantiza borrado forense. |

## Preparar el conjunto de escenarios

La instalación no crea audios humanos artificiales. Para disponer del catálogo A–D:

1. Preparar las voces Piper locales para sintetizar A/B.
2. Obtener consentimiento y grabar C/D leyendo exactamente los textos declarados en `backend/app/services/scenario_service.py`.
3. Ejecutar `scripts/generate_demo_samples.py` con ambas rutas, `--consent-confirmed` y `--transcripts-reviewed`; el segundo flag declara que el operador comparó ambas grabaciones con el guion.
4. Confirmar en Dashboard que el catálogo muestre las muestras como disponibles. Sin un manifiesto coincidente, el backend las trata como no disponibles.
5. Si no hay voz humana grabada, presentar A/B y un control sintético legítimo generado durante la sesión; dejar C/D y el benchmark como no ejecutados.

El manifiesto `backend/data/audio_samples/scenario_provenance.json` se genera localmente, no se versiona, y no reemplaza consentimiento documentado ni revisión del audio.

## Cambios de interpretación implementados

- La detección acústica y la marca se muestran como señales informativas; por sí solas no suben el nivel operacional ni etiquetan una llamada como fraude.
- Una solicitud sensible activa cautela independientemente de que la voz parezca humana o sintética.
- La evaluación etiqueta la verificación como registro del operador y explicita que el canal no fue consultado por el software.
- El benchmark presenta sus datos fuente y sus resultados medidos, sin afirmar de antemano que hubo degradación.
- El purgado devuelve el alcance y los elementos que no elimina.

## Diferencias que deben quedar declaradas en la exposición

El informe puede describir AASIST, PerthNet u otros controles como parte del diseño propuesto. La versión del repositorio debe presentarse según el motor que realmente se cargó en ese equipo. Para afirmar resultados del AASIST oficial, se debe integrar y verificar ese modelo antes de la defensa; renombrar el baseline no constituye esa integración.

También debe indicarse si C/D son grabaciones originales consentidas o si no están disponibles. No describir una voz generada por Piper como humana ni presentar las cuatro combinaciones como cubiertas cuando falta el control sintético legítimo.
