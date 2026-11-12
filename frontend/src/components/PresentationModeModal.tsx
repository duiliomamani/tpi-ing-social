"use client";

import React, { useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Mic,
  Phone,
  Activity,
  Layers,
  Brain,
  CheckCircle2,
  Lock,
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
    content: (
      <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
        <p>
          Tradicionalmente, el vishing requería de actores humanos que fingían identidades con entonaciones ensayadas.
          La democratización de los modelos neurales de texto a voz (TTS zero-shot) permite hoy clonar la voz de un directivo
          o familiar a partir de breves segundos de audio público extraídos de redes sociales o conferencias.
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
    title: "2. Generación Ética y Procedencia (F5-TTS & PerTh)",
    tagline: "¿Cómo se produce un clon de voz y cómo se audita su origen?",
    content: (
      <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
        <p>
          En este módulo F5-TTS genera habla en español a partir del texto y condiciona la voz con una muestra
          autorizada y su transcripción literal. Las mediciones de F0 sirven para comparar el resultado; no se fuerza
          una frecuencia única ni se ecualizan formantes de forma global.
        </p>
        <div className="rounded-lg bg-black/40 border border-cyan-500/30 p-3 space-y-1 text-slate-300">
          <strong className="text-cyan-300 block">Salvaguardas del laboratorio:</strong>
          <div>1. <strong className="text-white">Consentimiento Explícito:</strong> La API rechaza cualquier inferencia si no hay autorización expresa.</div>
          <div>2. <strong className="text-white">Marca PerTh:</strong> El laboratorio intenta agregar una marca de procedencia al audio generado por F5-TTS.</div>
        </div>
      </div>
    )
  },
  {
    step: 3,
    tab: "simulation",
    title: "3. Simulación Controlada de Vishing",
    tagline: "Los 4 escenarios pedagógicos de manipulación",
    content: (
      <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
        <p>
          Para que el laboratorio sea seguro, no se realizan llamadas reales a la red telefónica.
          Se implementa una consola telefónica ficticia con 4 casos de estudio:
        </p>
        <ul className="space-y-1 list-disc list-inside">
          <li><strong className="text-white">Escenario A:</strong> Suplantación de autoridad (Director de Operaciones).</li>
          <li><strong className="text-white">Escenario B:</strong> Urgencia emocional en aduanas aeroportuarias.</li>
          <li><strong className="text-white">Escenario C:</strong> Control negativo benigno de comunicación cotidiana.</li>
          <li><strong className="text-white">Escenario D:</strong> Phishing telefónico con voz humana real (demuestra que la trampa no depende de la IA).</li>
        </ul>
      </div>
    )
  },
  {
    step: 4,
    tab: "detection",
    title: "4. Detección Acústica Física (AASIST)",
    tagline: "Clasificación espectro-temporal y scores no calibrados",
    content: (
      <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
        <p>
          La red neuronal AASIST evalúa la continuidad de fase y la distribución armónica. Si el audio fue generado
          por un vocoder neuronal, el modelo arroja un score técnico positivo.
        </p>
        <p className="rounded bg-amber-500/10 border border-amber-500/30 p-2 text-amber-200">
          <strong>Rigor Académico:</strong> Los scores se presentan como valores técnicos de logit, no como porcentajes
          de probabilidad inventados, reconociendo que los detectores no están universalmente calibrados.
        </p>
      </div>
    )
  },
  {
    step: 5,
    tab: "confidence",
    title: "5. Análisis Semántico con Gemma 3 4B",
    tagline: "Detección de los 8 factores de manipulación psicológica",
    content: (
      <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
        <p>
          El audio se transcribe con Whisper y se remite al LLM local Gemma 3 4B bajo aislamiento estricto de prompt
          injection. El modelo evalúa objetivamente:
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
    step: 6,
    tab: "confidence",
    title: "6. Matriz de Confianza y la Regla de Oro",
    tagline: "Defensa en Profundidad ante el 'Escenario D'",
    content: (
      <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
        <p>
          ¿Qué ocurre si un atacante utiliza una voz humana natural para pedir una clave OTP (Escenario D)?
          El detector acústico dirá "Voz Humana".
        </p>
        <p className="rounded-lg bg-rose-950/40 border border-rose-500/40 p-3 text-rose-200 font-semibold">
          <strong>LA REGLA DE ORO DE VOICESHIELD:</strong> Si existe una solicitud sensible (transferencia, contraseña, OTP)
          y la identidad NO fue confirmada por un canal independiente, el veredicto es obligatoriamente ALTO RIESGO.
          ¡Se debe cortar y verificar fuera de banda!
        </p>
      </div>
    )
  },
  {
    step: 7,
    tab: "experiments",
    title: "7. Robustez Acústica y Filtros Telefónicos",
    tagline: "El impacto de la compresión y el ancho de banda telefónico (PSTN)",
    content: (
      <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
        <p>
          El laboratorio ejecuta transformaciones FFmpeg sobre audios reales y sintéticos:
          filtro pasa-banda telefónico (300Hz-3400Hz), compresión MP3 y ruido aditivo.
        </p>
        <p>
          <strong className="text-cyan-400">Hallazgo clave:</strong> En canal telefónico, la tasa de error (EER) se dispara.
          Esto demuestra empíricamente por qué las organizaciones no pueden depender exclusivamente de detectores
          automáticos de audio y deben implementar protocolos humanos de autenticación.
        </p>
      </div>
    )
  },
  {
    step: 8,
    tab: "conclusions",
    title: "8. Conclusiones y Recomendaciones Defensivas",
    tagline: "Protocolo operativo para organizaciones y saneamiento de datos",
    content: (
      <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
        <p>
          VoiceShield Lab demuestra que la tecnología de clonación de voz es accesible, pero la defensa
          es factible mediante la combinación de análisis forense, análisis semántico con LLMs locales
          y disciplina operativa fuera de banda.
        </p>
        <p>
          Al concluir el ejercicio, el laboratorio permite purgar todos los datos biométricos y grabaciones temporales,
          cumpliendo con los más altos estándares de privacidad y ética académica.
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
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      onJumpToTab(PRESENTATION_STEPS[nextIdx].tab);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      onJumpToTab(PRESENTATION_STEPS[prevIdx].tab);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-cyan-500/40 bg-cyber-900 p-6 shadow-[0_0_50px_rgba(0,240,255,0.2)] relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="h-4 w-4" />
          <span>Modo Exposición Universitaria — Paso {currentStep.step} de {PRESENTATION_STEPS.length}</span>
        </div>

        <h3 className="text-xl font-black text-white">{currentStep.title}</h3>
        <p className="text-xs text-cyan-300/80 font-medium mt-0.5 mb-4">{currentStep.tagline}</p>

        {/* Content Body */}
        <div className="rounded-xl border border-slate-800 bg-cyber-850 p-5 min-h-[220px]">
          {currentStep.content}
        </div>

        {/* Navigation Footer */}
        <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-30 transition"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Anterior</span>
          </button>

          {/* Stepper dots */}
          <div className="flex items-center space-x-1.5">
            {PRESENTATION_STEPS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentStepIndex(idx);
                  onJumpToTab(s.tab);
                }}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStepIndex ? "w-6 bg-cyan-400" : "w-2 bg-slate-700 hover:bg-slate-600"
                }`}
              />
            ))}
          </div>

          {currentStepIndex < PRESENTATION_STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              className="flex items-center space-x-1 rounded-lg bg-cyan-500 px-4 py-1.5 text-xs font-bold text-black hover:bg-cyan-400 transition"
            >
              <span>Siguiente</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex items-center space-x-1 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-bold text-black hover:bg-emerald-400 transition"
            >
              <span>Finalizar Exposición</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
