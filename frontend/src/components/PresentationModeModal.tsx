"use client";

import React, { useEffect, useRef } from "react";
import { X, ArrowLeft, ShieldAlert, PhoneCall, Mic, AudioWaveform } from "lucide-react";

interface PresentationModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToTab?: (tabId: string) => void;
}

export const PresentationModeModal: React.FC<PresentationModeModalProps> = ({
  isOpen,
  onClose,
  onJumpToTab,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key and prevent body scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Ensure FontAwesome is available
    const faId = "font-awesome-cdn";
    if (!document.getElementById(faId)) {
      const link = document.createElement("link");
      link.id = faId;
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css";
      document.head.appendChild(link);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  // Intersection Observer inside the modal scroll container
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    const observerOptions = {
      root: container,
      rootMargin: "0px",
      threshold: 0.15,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
        } else {
          entry.target.classList.remove("active");
        }
      });
    }, observerOptions);

    const revealElements = container.querySelectorAll(".reveal");
    revealElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNavigate = (tabId: string) => {
    if (onJumpToTab) {
      onJumpToTab(tabId);
    }
    onClose();
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Presentación interactiva VoiceShield Lab"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#020617] text-[#f8fafc] font-sans scroll-smooth selection:bg-cyan-500 selection:text-white"
    >
      {/* Dynamic Cyberpunk & Neon Styles */}
      <style jsx global>{`
        .modal-bg-grid {
          background-size: 40px 40px;
          background-image: linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 0;
          pointer-events: none;
        }

        .modal-bg-glow {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80vw;
          height: 80vh;
          background: radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, rgba(2, 6, 23, 0) 70%);
          z-index: 0;
          pointer-events: none;
        }

        .text-neon-blue {
          color: #38bdf8;
          text-shadow: 0 0 10px rgba(56, 189, 248, 0.5);
        }
        .text-neon-green {
          color: #34d399;
          text-shadow: 0 0 10px rgba(52, 211, 153, 0.5);
        }
        .box-neon-blue {
          box-shadow: 0 0 20px rgba(56, 189, 248, 0.2);
          border: 1px solid rgba(56, 189, 248, 0.3);
        }

        .reveal {
          opacity: 0;
          transform: translateY(50px);
          transition: all 0.8s cubic-bezier(0.5, 0, 0, 1);
        }
        .reveal.active {
          opacity: 1;
          transform: translateY(0);
        }

        .delay-100 { transition-delay: 100ms; }
        .delay-200 { transition-delay: 200ms; }
        .delay-300 { transition-delay: 300ms; }
        .delay-400 { transition-delay: 400ms; }

        .pres-section {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
          z-index: 10;
        }

        .scroll-indicator-anim {
          position: absolute;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          animation: bounceIndicator 2s infinite;
          opacity: 0.6;
        }
        @keyframes bounceIndicator {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0) translateX(-50%); }
          40% { transform: translateY(-20px) translateX(-50%); }
          60% { transform: translateY(-10px) translateX(-50%); }
        }
      `}</style>

      {/* Background Grid and Glow */}
      <div className="modal-bg-grid" />
      <div className="modal-bg-glow" />

      {/* Floating Control Bar */}
      <header className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar presentación y volver al laboratorio"
          className="pointer-events-auto flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-slate-900/80 px-3.5 py-2 text-xs font-semibold text-cyan-300 shadow-xl backdrop-blur-md transition-all hover:bg-cyan-950/80 hover:text-white hover:border-cyan-400"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al Laboratorio (Esc)</span>
        </button>

        <div className="pointer-events-auto flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-400 backdrop-blur-md">
            <ShieldAlert className="h-3.5 w-3.5 text-cyan-400" />
            <span>VoiceShield Lab — Presentación</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/80 text-slate-300 backdrop-blur-md transition hover:bg-rose-950/80 hover:border-rose-500/50 hover:text-rose-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* 1. Hero / Inicio */}
      <section id="hero" className="pres-section flex-col text-center">
        <div className="reveal max-w-4xl pt-12 sm:pt-0">
          <div className="inline-block px-4 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-8">
            Ingeniería Social & IA
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
            ¿Por qué una llamada puede{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
              engañarnos?
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 mb-10 max-w-2xl mx-auto font-light">
            Imagina que un familiar te pide dinero urgente... la voz es idéntica. <br />
            <strong className="text-white font-semibold">¿Y si no es él?</strong>
          </p>
          <i className="fa-solid fa-phone-volume text-5xl text-neon-blue animate-pulse"></i>
        </div>
        <div className="scroll-indicator-anim">
          <span className="text-xs tracking-widest uppercase text-slate-500 block mb-2 font-mono">
            Scroll
          </span>
          <i className="fa-solid fa-chevron-down text-slate-500"></i>
        </div>
      </section>

      {/* 2. El Ataque de Vishing */}
      <section id="attack" className="pres-section flex-col">
        <div className="reveal max-w-6xl w-full">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            El Ataque de <span className="text-neon-blue">Vishing</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="reveal delay-100 bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl box-neon-blue text-center flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center mb-6 border border-cyan-500/30">
                <i className="fa-solid fa-microphone-lines text-3xl text-cyan-400"></i>
              </div>
              <h3 className="text-2xl font-bold mb-4">1. Preparación</h3>
              <p className="text-slate-400">
                Clonación de la voz mediante IA a partir de muestras cortas (3-15 seg).
              </p>
            </div>
            {/* Card 2 */}
            <div className="reveal delay-200 bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl box-neon-blue text-center flex flex-col items-center relative">
              <div className="hidden md:block absolute top-1/4 -left-4 w-8 border-t-2 border-dashed border-cyan-500/30"></div>
              <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/30">
                <i className="fa-solid fa-user-secret text-3xl text-blue-400"></i>
              </div>
              <h3 className="text-2xl font-bold mb-4">2. Interacción</h3>
              <p className="text-slate-400">
                Aplicación de ingeniería social: urgencia, autoridad y presión psicológica.
              </p>
            </div>
            {/* Card 3 */}
            <div className="reveal delay-300 bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl box-neon-blue text-center flex flex-col items-center relative">
              <div className="hidden md:block absolute top-1/4 -left-4 w-8 border-t-2 border-dashed border-cyan-500/30"></div>
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/30">
                <i className="fa-solid fa-money-bill-transfer text-3xl text-red-400"></i>
              </div>
              <h3 className="text-2xl font-bold mb-4">3. Acción</h3>
              <p className="text-slate-400">
                Solicitud de transferencias, robo de credenciales o bypass de MFA.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. La Amenaza */}
      <section id="threat" className="pres-section flex-col text-center">
        <div className="reveal max-w-4xl bg-slate-900/80 p-8 sm:p-12 rounded-3xl border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)] backdrop-blur-md">
          <i className="fa-solid fa-triangle-exclamation text-6xl text-red-500 mb-8 animate-pulse"></i>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            Detectar una voz sintética <br />
            <span className="text-red-400 underline decoration-red-500/50 underline-offset-8">
              NO equivale
            </span>{" "}
            a detectar un fraude
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Los ciberdelincuentes utilizan tanto voces clonadas como reales. <br />
            La verdadera amenaza reside en la <strong>intención semántica</strong> del mensaje y la
            manipulación psicológica.
          </p>
        </div>
      </section>

      {/* 4. VoiceShield Lab */}
      <section id="lab" className="pres-section flex-col">
        <div className="reveal max-w-5xl w-full">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-emerald-500/30 text-emerald-400 mb-6 text-sm">
                <i className="fa-solid fa-flask"></i> Entorno de Prueba
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                VoiceShield <span className="text-neon-green">Lab</span>
              </h2>
              <p className="text-lg text-slate-400 mb-6">
                Metodología diseñada para generar clones autorizados y analizar vectores de ataque.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                  <i className="fa-solid fa-microchip text-emerald-400 mt-1"></i>
                  <div>
                    <h4 className="font-bold text-white">Qwen3-TTS local</h4>
                    <p className="text-sm text-slate-400">
                      Generación local condicionada por una muestra de voz autorizada.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                  <i className="fa-solid fa-code-compare text-emerald-400 mt-1"></i>
                  <div>
                    <h4 className="font-bold text-white">4 Escenarios de Prueba</h4>
                    <p className="text-sm text-slate-400">
                      Comparación directa: Voz Real vs. Voz Sintética con y sin manipulación.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="flex-1">
              <div className="relative w-full aspect-square max-w-md mx-auto">
                <div className="absolute inset-0 rounded-full border border-dashed border-emerald-500/30 animate-[spin_20s_linear_infinite]"></div>
                <div className="absolute inset-4 rounded-full border border-emerald-500/20 animate-[spin_15s_linear_infinite_reverse]"></div>
                <div className="absolute inset-0 flex items-center justify-center flex-col text-center p-8 bg-slate-900/80 rounded-full border border-emerald-500/50 backdrop-blur shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                  <i className="fa-solid fa-shield-halved text-6xl text-emerald-400 mb-4"></i>
                  <h3 className="text-xl font-bold">
                    Arquitectura <br />
                    Cero Confianza
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. El Escudo (Defensa) */}
      <section id="shield" className="pres-section flex-col">
        <div className="reveal max-w-6xl w-full">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            Mecanismos de{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              Defensa
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* AASIST */}
            <div className="reveal delay-100 bg-gradient-to-b from-slate-800 to-slate-900 p-8 rounded-2xl border border-slate-700 hover:border-blue-500/50 transition-colors">
              <i className="fa-solid fa-wave-square text-4xl text-blue-400 mb-6 block"></i>
              <h3 className="text-2xl font-bold mb-3 text-white">AASIST</h3>
              <p className="text-slate-400 text-sm">
                Modelo avanzado para la identificación de huellas acústicas y artefactos propios de
                la síntesis vocal generada por IA.
              </p>
            </div>
            {/* PerTh */}
            <div className="reveal delay-200 bg-gradient-to-b from-slate-800 to-slate-900 p-8 rounded-2xl border border-slate-700 hover:border-purple-500/50 transition-colors">
              <i className="fa-solid fa-fingerprint text-4xl text-purple-400 mb-6 block"></i>
              <h3 className="text-2xl font-bold mb-3 text-white">PerTh</h3>
              <p className="text-slate-400 text-sm">
                Sistema de verificación de marcas de agua digitales imperceptibles incrustadas
                durante la generación de la voz sintética.
              </p>
            </div>
            {/* Transcripción */}
            <div className="reveal delay-300 bg-gradient-to-b from-slate-800 to-slate-900 p-8 rounded-2xl border border-slate-700 hover:border-cyan-500/50 transition-colors">
              <i className="fa-solid fa-language text-4xl text-cyan-400 mb-6 block"></i>
              <h3 className="text-2xl font-bold mb-3 text-white">Whisper + Gemma</h3>
              <p className="text-slate-400 text-sm">
                Transcripción precisa y análisis semántico para detectar patrones de engaño,
                solicitudes urgentes y manipulación de contexto.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Conclusión y Regla de Oro */}
      <section id="conclusion" className="pres-section flex-col text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-64 bg-cyan-500/20 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="reveal max-w-4xl z-10">
          <i className="fa-solid fa-key text-5xl text-yellow-500 mb-8"></i>
          <h2 className="text-5xl md:text-7xl font-extrabold mb-8 tracking-tight">
            La voz{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-yellow-500">
              ya no es prueba
            </span>{" "}
            de identidad.
          </h2>

          <div className="bg-slate-900/80 p-8 rounded-2xl border border-yellow-500/30 backdrop-blur mt-12 inline-block text-left shadow-[0_0_30px_rgba(234,179,8,0.1)]">
            <h3 className="text-xl font-bold text-yellow-400 uppercase tracking-wider mb-2 flex items-center gap-3">
              <i className="fa-solid fa-star"></i> La Regla de Oro
            </h3>
            <p className="text-2xl text-white font-medium">
              Verifica toda solicitud crítica por un <br />
              <span className="text-cyan-400 font-bold underline decoration-cyan-500/50">
                canal independiente
              </span>{" "}
              (fuera de banda).
            </p>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-3 font-semibold text-white shadow-lg shadow-cyan-900/50 hover:from-cyan-500 hover:to-blue-500 transition-all border border-cyan-400/30"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Entrar al Laboratorio Interactivo</span>
            </button>
            {onJumpToTab && (
              <>
                <button
                  type="button"
                  onClick={() => handleNavigate("generation")}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-slate-900/80 px-4 py-3 text-xs font-semibold text-cyan-300 hover:bg-cyan-950 transition-all"
                >
                  <Mic className="h-4 w-4" />
                  <span>Probar clonación con Qwen3-TTS</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate("simulation")}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-slate-900/80 px-4 py-3 text-xs font-semibold text-emerald-300 hover:bg-emerald-950 transition-all"
                >
                  <PhoneCall className="h-4 w-4" />
                  <span>Sala de Llamadas 3D</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate("detection")}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-slate-900/80 px-4 py-3 text-xs font-semibold text-amber-300 hover:bg-amber-950 transition-all"
                >
                  <AudioWaveform className="h-4 w-4" />
                  <span>Detección Acústica</span>
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
