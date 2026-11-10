# VoiceShield Lab — Documentación de Limitaciones Técnicas y Metodológicas

Este documento detalla de manera rigurosa y transparente las limitaciones inherentes a los modelos, técnicas y aproximaciones implementadas en **VoiceShield Lab**, para su consideración en la defensa y evaluación académica.

---

## 1. Detección Acústica y Clasificador AASIST

### 1.1. Ausencia de Calibración Probabilística Universal
- **Limitación:** Las puntuaciones emitidas por la arquitectura AASIST (`raw_score`) son logits o valores técnicos de verosimilitud relativa, **no probabilidades calibradas porcentuales**.
- **Fundamento Científico:** Un modelo entrenado en benchmarks como ASVspoof 2019/2021 asume una distribución previa de ataques específica. Trasladar dicho modelo a condiciones de "mundo real" (open-set) altera drásticamente la tasa de falsos positivos si los scores se interpretan como probabilidades bayesianas directas.
- **Mitigación en VoiceShield:** La interfaz y la API declaran expresamente los valores como *scores técnicos crudos*, evitando mostrar falsas precisiones como "99.8% sintético".

### 1.2. Degradación ante Códecs Telefónicos (Canal PSTN / G.711)
- **Limitación:** El canal de voz telefónico tradicional recorta las frecuencias por debajo de 300 Hz y por encima de 3.400 Hz (banda estrecha).
- **Impacto:** Los artefactos distintivos de los vocoders neurales residen preponderantemente en la fase y en armónicos superiores a 5.000 Hz. Al atravesar un canal telefónico, la pérdida de información de alta frecuencia eleva el Equal Error Rate (EER), provocando solapamiento entre voces biológicas y clonadas.
- **Demostración en el Lab:** El módulo de Experimentos reproduce este efecto aplicando filtros de banda estrecha con FFmpeg, evidenciando empíricamente la caída del F1-Score.

### 1.3. Robustez ante Ruido Acústico y Reverberación
- **Limitación:** Ambientes ruidosos (calle, cafeterías) o grabaciones con reverberación de sala enmascaran la envolvente espectral, desplazando la inferencia hacia la zona de *resultado indeterminado* (`[-0.7, +0.7]`).

---

## 2. Procedencia y Marcas de Agua Perceptuales (PerTh)

### 2.1. Asimetría Fundamental de la Ausencia de Marca
- **Axioma:** *La presencia de marca de agua confirma la procedencia sintética; su ausencia NO demuestra que la voz sea humana.*
- **Vulnerabilidad:** Un atacante malicioso puede emplear motores de síntesis de código abierto sin marcas de agua, o aplicar procesos de re-muestreo y filtrado pasa-bajos destinados a erosionar la correlación de la portadora PerTh.

### 2.2. Robustez de la Integración Coherente
- La detección por matched filter acumulado requiere una duración mínima (~2.0 segundos) para acumular suficiente relación señal-ruido. Muestras monosilábicas o de duración inferior a 1 segundo pueden arrojar indeterminación.

---

## 3. Análisis Semántico de Ingeniería Social con Gemma 3 4B

### 3.1. Dependencia de la Fidelidad de Transcripción (Whisper STT)
- Si la calidad del audio es defectuosa o existen modismos regionales muy marcados, la transcripción de `faster-whisper` puede omitir o tergiversar términos clave, afectando el análisis semántico del LLM.

### 3.2. Pretextos Sofisticados y Sutiles (Bajo Perfil)
- Ataques de ingeniería social dirigidos (Spear-Vishing) pueden estructurarse sin recurrir a imperativos agresivos de urgencia ni amenazas manifiestas, mimetizándose con la operativa habitual de la víctima.

### 3.3. Defensa contra Inyección de Prompt
- Aunque VoiceShield Lab aísla la transcripción como texto no confiable (`<EVIDENCIA_TRANSCRIPCION>`) y prohíbe taxativamente la ejecución de directivas internas, un atacante sofisticado podría intentar ataques de Jailbreak lingüístico dentro del contenido de voz.

---

## 4. La Regla de Oro y Conclusión Metodológica

> [!CAUTION]
> **Ninguna defensa técnica univariada (acústica, criptográfica o semántica) es infalible por sí sola.**

El mayor aporte metodológico de este trabajo universitario es la demostración del **Escenario D** (Vishing con voz humana real):
- Frente a un atacante humano capacitado, el detector acústico AASIST devolverá "Evidencia compatible con voz humana".
- La única contramedida definitiva reside en la **Defensa en Profundidad**: si se solicita una acción sensible (transferencia, clave, bypass) y el canal no fue verificado de forma independiente, el protocolo exige **detener la acción y confirmar por llamada inversa fuera de banda**.
