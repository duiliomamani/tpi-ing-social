"use client";

import React, { useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from "lucide-react";

interface PresentationModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToTab: (tabId: string) => void;
}

const PRESENTATION_STEPS = [
  {
    step: 1,
    tab: "dashboard",
    title: "1. Introducción y Contexto de la Amenaza",
    tagline: "El nuevo vector: Ingeniería Social amplificada por Modelos Generativos de Audio",
    demoAction: "Mostrá los cuatro cuadrantes y ejecutá un caso con audio disponible. Si falta el audio pregrabado, cargá un equivalente desde el análisis acústico.",
    content: (
      <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
        <p>
          El vishing puede usar una voz humana o una voz sintética. Los modelos de generación y clonación amplían las
          opciones de suplantación, pero el timbre de voz por sí solo no permite decidir si un pedido es legítimo.
        </p>
        <p>
          <strong className="text-cyan-400">Objetivo del Proyecto:</strong> Diseñar y evaluar VoiceShield Lab como una
          plataforma local, ética y reproducible para estudiar la anatomía del ataque y probar defensas en profundidad.
        </p>
      </div>
    )
  },
  {
    step: 2,
    tab: "generation",
    title: "2. Generación ética y procedencia",
    tagline: "¿Cómo se produce un clon de voz y cómo se audita su origen?",
    demoAction: "Usá solo una referencia consentida. Revisá el recorte y su transcripción; para una exposición breve, prepará el audio antes de presentar.",
    content: (
      <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
        <p>
          En este módulo F5-TTS genera habla en español a partir del texto y una referencia con autorización declarada
          por el operador. Las mediciones de F0 sirven para comparar el resultado; no aseguran similitud de identidad
          ni naturalidad, y no se fuerza una frecuencia única.
        </p>
        <div className="rounded-lg bg-black/40 border border-cyan-500/30 p-3 space-y-1 text-slate-300">
          <strong className="text-cyan-300 block">Qué mostrar:</strong>
          <div>1. <strong className="text-white">Consentimiento:</strong> la generación requiere confirmar autorización antes de sintetizar.</div>
          <div>2. <strong className="text-white">Procedencia:</strong> revisá qué marca consultó el sistema; su presencia no prueba identidad ni intención.</div>
        </div>
      </div>
    )
  },
  {
    step: 3,
    tab: "detection",
    title: "3. Detección acústica experimental",
    tagline: "Señales acústicas y procedencia, con sus limitaciones",
    demoAction: "Analizá el mismo WAV generado o subido. Señalá el motor exacto, el score y la firma consultada; no los presentes como probabilidades de identidad.",
    content: (
      <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
        <p>
          El prototipo acústico de VoiceShield devuelve una etiqueta exploratoria compatible con voz humana, síntesis
          o un resultado indeterminado. No es el AASIST oficial y su score no está calibrado.
        </p>
        <p className="rounded bg-amber-500/10 border border-amber-500/30 p-2 text-amber-200">
          <strong>Lectura correcta:</strong> PerthNet se usa si está instalado; en otro caso se consulta la firma experimental
          de VoiceShield. La ausencia de marca no prueba origen humano, y el detector no verifica identidad.
        </p>
      </div>
    )
  },
  {
    step: 4,
    tab: "confidence",
    title: "4. Revisar el contenido del mensaje",
    tagline: "La transcripción aporta contexto; una persona debe revisar sus errores",
    demoAction: "Revisá o corregí el texto transcripto antes de ejecutar la evaluación. Mostrá qué indicadores detectó el análisis semántico y con qué evidencia.",
    content: (
      <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
        <p>
          La transcripción local se usa como entrada para buscar señales como urgencia, autoridad, secretismo, pedido de dinero
          o solicitud de claves. El análisis puede equivocarse si la transcripción o el contexto son incompletos.
        </p>
        <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-cyan-300">
          <div>• Autoridad declarada</div>
          <div>• Urgencia artificial</div>
          <div>• Presión emocional</div>
          <div>• Petición de claves/OTP</div>
          <div>• Solicitud de dinero</div>
          <div>• Evasión de canales</div>
          <div>• Amenazas de despido</div>
          <div>• Identidad no verificada</div>
        </div>
      </div>
    )
  },
  {
    step: 5,
    tab: "dashboard",
    title: "5. Matriz de Confianza y la Regla de Oro",
    tagline: "Evaluación conjunta de audio, contenido e identidad",
    demoAction: "Si hay una grabación D consentida, mostrá que un guion humano puede pedir un OTP. Marcá verificación independiente solo si realmente se hizo fuera del laboratorio.",
    content: (
      <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
        <p>
          El escenario D usa un guion de solicitud de OTP. Solo se etiqueta como voz humana si se aporta una grabación
          consentida y se registra su procedencia; el laboratorio no valida automáticamente ese origen.
        </p>
        <p className="rounded-lg bg-rose-950/40 border border-rose-500/40 p-3 text-rose-200 font-semibold">
          <strong>PROTOCOLO DEFENSIVO:</strong> Una solicitud de transferencia, contraseña u OTP debe verificarse por un canal
          independiente. La clasificación automática orienta el análisis; no reemplaza esa verificación.
        </p>
      </div>
    )
  },
  {
    step: 6,
    tab: "experiments",
    title: "6. Robustez Acústica y Filtros Telefónicos",
    tagline: "El impacto de la compresión y el ancho de banda telefónico (PSTN)",
    demoAction: "Si el tiempo y el backend lo permiten, ejecutá el benchmark y comentá los valores observados. No anticipes resultados ni generalices desde pocas muestras.",
    content: (
      <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
        <p>
          El laboratorio transforma una grabación C declarada humana y una A sintética Piper: filtro pasa-banda
          telefónico (300–3400 Hz), compresión MP3 y ruido aditivo.
        </p>
        <p className="rounded bg-amber-500/10 border border-amber-500/30 p-2 text-amber-200">
          Compará las métricas que entregue esta ejecución. El benchmark usa pocas muestras y sirve como demostración técnica,
          no como estimación de rendimiento en producción.
        </p>
      </div>
    )
  },
  {
    step: 7,
    tab: "conclusions",
    title: "7. Conclusiones y Recomendaciones Defensivas",
    tagline: "Protocolo operativo para organizaciones y saneamiento de datos",
    demoAction: "Cerrá con el protocolo de respuesta, exportá el informe local y purgá los audios temporales cuando termine la exposición.",
    content: (
      <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
        <p>
          VoiceShield Lab permite observar señales acústicas, marcas consultadas y contenido transcripto por separado.
          Ninguna de estas señales autentica a quien llama; la verificación y el flujo formal siguen en manos de la organización.
        </p>
        <p>
          La limpieza elimina archivos de sesión, clones, derivados y grabaciones humanas C/D registradas, junto con
          metadatos locales. Conserva A/B sintéticas y pesos; no elimina informes ya descargados ni garantiza borrado forense.
        </p>
      </div>
    )
  }
];

export const PresentationModeModal: React.FC<PresentationModeModalProps> = ({
  isOpen,
  onClose,
  onJumpToTab
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = PRESENTATION_STEPS[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < PRESENTATION_STEPS.length - 1) {
      setCurrentStepIndex((index) => index + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((index) => index - 1);
    }
  };

  const handleOpenModule = () => {
    onClose();
    onJumpToTab(currentStep.tab);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="presentation-step-title" className="w-full max-w-2xl rounded-2xl border border-cyan-500/40 bg-cyber-900 p-6 shadow-[0_0_50px_rgba(0,240,255,0.2)] relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar guion de presentación"
          className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="h-4 w-4" />
          <span>Guion de PoC — Paso {currentStep.step} de {PRESENTATION_STEPS.length}</span>
        </div>

        <h3 id="presentation-step-title" className="text-xl font-black text-white">{currentStep.title}</h3>
        <p className="text-xs text-cyan-300/80 font-medium mt-0.5 mb-4">{currentStep.tagline}</p>

        {/* Content Body */}
        <div className="rounded-xl border border-slate-800 bg-cyber-850 p-5 min-h-[220px]">
          {currentStep.content}
          <div className="mt-4 rounded-lg border border-cyan-500/25 bg-cyan-950/25 p-3 text-xs leading-relaxed text-cyan-100">
            <strong className="mb-1 block text-cyan-300">Acción para mostrar</strong>
            {currentStep.demoAction}
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-30 transition"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Anterior</span>
          </button>

          {/* Stepper dots */}
          <div className="hidden items-center space-x-1.5 sm:flex">
            {PRESENTATION_STEPS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Ir al paso ${s.step}: ${s.title}`}
                aria-current={idx === currentStepIndex ? "step" : undefined}
                onClick={() => {
                  setCurrentStepIndex(idx);
                }}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStepIndex ? "w-6 bg-cyan-400" : "w-2 bg-slate-700 hover:bg-slate-600"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenModule}
              title={`Abrir la etapa en ${currentStep.tab}`}
              className="flex items-center space-x-1 rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-900/60 transition"
            >
              <span>Abrir módulo</span>
              <ChevronRight className="h-4 w-4" />
            </button>
            {currentStepIndex < PRESENTATION_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center space-x-1 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-cyan-400 transition"
              >
                <span>Siguiente</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="flex items-center space-x-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-emerald-400 transition"
              >
                <span>Finalizar guion</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
