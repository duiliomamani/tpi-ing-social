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
      threshold: 0.12,
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
        .text-neon-purple {
          color: #c084fc;
          text-shadow: 0 0 10px rgba(192, 132, 252, 0.5);
        }
        .text-neon-amber {
          color: #fbbf24;
          text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
        }

        .box-neon-blue {
          box-shadow: 0 0 20px rgba(56, 189, 248, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.3);
        }
        .box-neon-emerald {
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .box-neon-purple {
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.15);
          border: 1px solid rgba(168, 85, 247, 0.3);
        }
        .box-neon-amber {
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .reveal {
          opacity: 0;
          transform: translateY(45px);
          transition: all 0.75s cubic-bezier(0.5, 0, 0, 1);
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
          padding: 3.5rem 1.5rem;
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
          className="pointer-events-auto flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-slate-900/85 px-3.5 py-2 text-xs font-semibold text-cyan-300 shadow-xl backdrop-blur-md transition-all hover:bg-cyan-950/90 hover:text-white hover:border-cyan-400"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al Laboratorio (Esc)</span>
        </button>

        <div className="pointer-events-auto flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-400 backdrop-blur-md">
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
          <div className="inline-block px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs sm:text-sm font-semibold tracking-widest uppercase mb-8">
            Ingeniería Social & IA Generativa
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
            ¿Por qué una llamada puede{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
              engañarnos?
            </span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-slate-400 mb-10 max-w-2xl mx-auto font-light">
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
          <div className="text-center mb-12">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">Vectores de Amenaza</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mt-2">
              Anatomía del Ataque de <span className="text-neon-blue">Vishing con IA</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="reveal delay-100 bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl box-neon-blue text-center flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center mb-6 border border-cyan-500/30">
                <i className="fa-solid fa-microphone-lines text-3xl text-cyan-400"></i>
              </div>
              <h3 className="text-2xl font-bold mb-4">1. Preparación</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Clonación de la voz mediante IA a partir de muestras cortas (3 a 15 segundos) recolectadas de redes sociales o audios públicos.
              </p>
            </div>
            {/* Card 2 */}
            <div className="reveal delay-200 bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl box-neon-blue text-center flex flex-col items-center relative">
              <div className="hidden md:block absolute top-1/4 -left-4 w-8 border-t-2 border-dashed border-cyan-500/30"></div>
              <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/30">
                <i className="fa-solid fa-user-secret text-3xl text-blue-400"></i>
              </div>
              <h3 className="text-2xl font-bold mb-4">2. Interacción</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Despliegue de técnicas de ingeniería social: falsa urgencia, invocación de autoridad y coerción emocional sobre la víctima.
              </p>
            </div>
            {/* Card 3 */}
            <div className="reveal delay-300 bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl box-neon-blue text-center flex flex-col items-center relative">
              <div className="hidden md:block absolute top-1/4 -left-4 w-8 border-t-2 border-dashed border-cyan-500/30"></div>
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/30">
                <i className="fa-solid fa-money-bill-transfer text-3xl text-red-400"></i>
              </div>
              <h3 className="text-2xl font-bold mb-4">3. Acción</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Ejecución del objetivo ilícito: transferencias inmediatas de dinero, exfiltración de credenciales bancarias o bypass de 2FA/MFA.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. La Amenaza Fundamental */}
      <section id="threat" className="pres-section flex-col text-center">
        <div className="reveal max-w-4xl bg-slate-900/80 p-8 sm:p-12 rounded-3xl border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.12)] backdrop-blur-md">
          <i className="fa-solid fa-triangle-exclamation text-6xl text-red-500 mb-8 animate-pulse"></i>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Detectar una voz sintética <br />
            <span className="text-red-400 underline decoration-red-500/50 underline-offset-8">
              NO equivale
            </span>{" "}
            a detectar un fraude
          </h2>
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Los ciberdelincuentes utilizan tanto voces clonadas como humanas reales. <br />
            La verdadera amenaza reside en la <strong className="text-white font-semibold">intención semántica</strong> del mensaje y la manipulación psicológica del interlocutor.
          </p>
        </div>
      </section>

      {/* 4. VoiceShield Lab: Entorno Controlado */}
      <section id="lab" className="pres-section flex-col">
        <div className="reveal max-w-5xl w-full">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-emerald-500/30 text-emerald-400 mb-6 text-xs sm:text-sm">
                <i className="fa-solid fa-flask"></i> Entorno de Prueba PoC
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
                VoiceShield <span className="text-neon-green">Lab</span>
              </h2>
              <p className="text-base sm:text-lg text-slate-300 mb-6 leading-relaxed">
                Plataforma académica diseñada para generar clones autorizados y evaluar vectores de ataque de forma controlada y reproducible.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                  <i className="fa-solid fa-microchip text-emerald-400 mt-1 text-xl"></i>
                  <div>
                    <h4 className="font-bold text-white">Qwen3-TTS (Inferencia local)</h4>
                    <p className="text-sm text-slate-400">
                      Generación local en español sin enviar datos biométricos a la nube de terceros.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                  <i className="fa-solid fa-code-compare text-emerald-400 mt-1 text-xl"></i>
                  <div>
                    <h4 className="font-bold text-white">4 Escenarios de Prueba Controlados</h4>
                    <p className="text-sm text-slate-400">
                      Comparación directa cruzada: Voz Real vs. Sintética × Intención Legítima vs. Maliciosa.
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
                  <span className="text-xs text-slate-400 mt-2">Zero Trust Vocal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Marco Ético y Salvaguardas (NUEVA SECCIÓN) */}
      <section id="ethics" className="pres-section flex-col">
        <div className="reveal max-w-6xl w-full">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-3">
              <i className="fa-solid fa-handshake-angle"></i> Principios de Seguridad Ética
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              Marco Ético y de <span className="text-neon-green">Consentimiento</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mt-3">
              Salvaguardas explícitas integradas en el diseño del sistema, respetando principios legales y entornos autorizados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Consentimiento Obligatorio */}
            <div className="reveal delay-100 bg-slate-900/60 backdrop-blur-sm p-7 rounded-2xl box-neon-emerald flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-5 border border-emerald-500/30 text-emerald-400">
                  <i className="fa-solid fa-file-signature text-2xl"></i>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-3">
                  Control Estricto de Inferencia
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Consentimiento Obligatorio</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  El módulo de clonación rechaza procesar cualquier muestra si no se marca una casilla de autorización legal informada explícita. Sin consentimiento, el motor bloquea la síntesis.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-emerald-400/80 font-mono flex items-center gap-2">
                <i className="fa-solid fa-check"></i> Autorización de uso registrada
              </div>
            </div>

            {/* 2. Prohibición de Deepfakes de Figuras Públicas */}
            <div className="reveal delay-200 bg-slate-900/60 backdrop-blur-sm p-7 rounded-2xl box-neon-emerald flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-xl bg-red-500/10 flex items-center justify-center mb-5 border border-red-500/30 text-red-400">
                  <i className="fa-solid fa-user-slash text-2xl"></i>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 mb-3">
                  Restricción Total
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Prohibición de Figuras Públicas</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  No se permite clonar la voz de funcionarios, celebridades o cualquier persona real que no sea un integrante del grupo que prestó su voz voluntariamente para los fines del laboratorio.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 font-mono flex items-center gap-2">
                <i className="fa-solid fa-shield"></i> Exclusivo para miembros voluntarios
              </div>
            </div>

            {/* 3. Purgado Ético */}
            <div className="reveal delay-300 bg-slate-900/60 backdrop-blur-sm p-7 rounded-2xl box-neon-emerald flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-5 border border-cyan-500/30 text-cyan-400">
                  <i className="fa-solid fa-trash-can-arrow-up text-2xl"></i>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 mb-3">
                  Privacidad & Minimización
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Purgado Ético de Datos</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Un botón administrativo integrado destruye todas las grabaciones y metadatos temporales una vez concluida la evaluación, minimizando la retención de datos biométricos.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-cyan-300 font-mono flex items-center gap-2">
                <i className="fa-solid fa-terminal"></i> /api/admin/clear-lab-data
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Mecanismos de Defensa en Profundidad */}
      <section id="shield" className="pres-section flex-col">
        <div className="reveal max-w-6xl w-full">
          <div className="text-center mb-14">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">Defensa en Profundidad</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mt-2">
              Mecanismos de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Defensa en Capas</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mt-3">
              Combinación de análisis físico-acústico, verificación de procedencia y razonamiento semántico.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* AASIST */}
            <div className="reveal delay-100 bg-gradient-to-b from-slate-800 to-slate-900 p-8 rounded-2xl border border-slate-700 hover:border-blue-500/50 transition-colors">
              <i className="fa-solid fa-wave-square text-4xl text-blue-400 mb-6 block"></i>
              <h3 className="text-2xl font-bold mb-3 text-white">AASIST</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Modelo espectral avanzado para la identificación de huellas acústicas y artefactos propios de la síntesis vocal generada por IA.
              </p>
            </div>
            {/* PerTh */}
            <div className="reveal delay-200 bg-gradient-to-b from-slate-800 to-slate-900 p-8 rounded-2xl border border-slate-700 hover:border-purple-500/50 transition-colors">
              <i className="fa-solid fa-fingerprint text-4xl text-purple-400 mb-6 block"></i>
              <h3 className="text-2xl font-bold mb-3 text-white">PerTh</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Sistema de verificación de marcas de agua digitales imperceptibles incrustadas durante la generación de la voz sintética.
              </p>
            </div>
            {/* Transcripción */}
            <div className="reveal delay-300 bg-gradient-to-b from-slate-800 to-slate-900 p-8 rounded-2xl border border-slate-700 hover:border-cyan-500/50 transition-colors">
              <i className="fa-solid fa-language text-4xl text-cyan-400 mb-6 block"></i>
              <h3 className="text-2xl font-bold mb-3 text-white">Whisper + Qwen3.5</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Whisper transcribe el audio y Qwen3.5 analiza señales de engaño, urgencia y manipulación del contexto.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Limitaciones Técnicas del Ecosistema (NUEVA SECCIÓN) */}
      <section id="limitations" className="pres-section flex-col">
        <div className="reveal max-w-6xl w-full">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3">
              <i className="fa-solid fa-triangle-exclamation"></i> Evaluación Rigurosa
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              Limitaciones <span className="text-neon-amber">Técnicas</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mt-3">
              Los mecanismos de detección presentan restricciones operativas reales: ninguna herramienta garantiza detección infalible.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. AASIST */}
            <div className="reveal delay-100 bg-slate-900/60 backdrop-blur-sm p-6 rounded-2xl box-neon-amber flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/30 text-amber-400">
                <i className="fa-solid fa-wave-square text-xl"></i>
              </div>
              <div>
                <h4 className="text-lg font-bold text-white mb-1">Incertidumbre en AASIST</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Puede confundir voces reales y sintéticas ante variaciones acústicas. Sus resultados no representan porcentajes exactos de certeza, sino puntajes exploratorios sin calibrar.
                </p>
              </div>
            </div>

            {/* 2. Calidad de Audio */}
            <div className="reveal delay-200 bg-slate-900/60 backdrop-blur-sm p-6 rounded-2xl box-neon-amber flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/30 text-amber-400">
                <i className="fa-solid fa-phone-slash text-xl"></i>
              </div>
              <div>
                <h4 className="text-lg font-bold text-white mb-1">Calidad del Audio y Telefonía</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  El ruido ambiente y la compresión con pérdida de los códecs telefónicos (AMR, GSM) degradan las altas frecuencias y dificultan severamente la detección de artefactos de IA.
                </p>
              </div>
            </div>

            {/* 3. PerTh */}
            <div className="reveal delay-300 bg-slate-900/60 backdrop-blur-sm p-6 rounded-2xl box-neon-amber flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/30 text-amber-400">
                <i className="fa-solid fa-fingerprint text-xl"></i>
              </div>
              <div>
                <h4 className="text-lg font-bold text-white mb-1">PerTh y Marcas Digitales</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  La ausencia de una marca digital no garantiza en absoluto que la voz sea humana. Un atacante puede emplear modelos de código abierto sin incorporar marcas de procedencia.
                </p>
              </div>
            </div>

            {/* 4. Transcripción y Semántica */}
            <div className="reveal delay-400 bg-slate-900/60 backdrop-blur-sm p-6 rounded-2xl box-neon-amber flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/30 text-amber-400">
                <i className="fa-solid fa-comments text-xl"></i>
              </div>
              <div>
                <h4 className="text-lg font-bold text-white mb-1">Análisis Semántico dependiente de ASR</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Cualquier error de transcripción fonética en el modelo de escucha puede distorsionar el sentido de las frases e impedir la identificación adecuada de señales de fraude.
                </p>
              </div>
            </div>
          </div>

          <div className="reveal mt-8 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 text-center text-amber-200 text-sm">
            <i className="fa-solid fa-triangle-exclamation mr-2"></i>
            <strong>Conclusión sobre las herramientas:</strong> Ninguna herramienta por sí sola garantiza una detección infalible. Se requiere combinar sus resultados con la verificación de identidad por un canal independiente.
          </div>
        </div>
      </section>

      {/* 8. Marco Jurídico Aplicable (Argentina) (NUEVA SECCIÓN) */}
      <section id="legal" className="pres-section flex-col">
        <div className="reveal max-w-6xl w-full">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs font-semibold uppercase tracking-widest mb-3">
              <i className="fa-solid fa-gavel"></i> Derecho Penal y Privacidad
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              Marco Jurídico Aplicable <span className="text-neon-purple">(Argentina)</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mt-3">
              Encuadre de la conducta modelada por VoiceShield Lab (vishing con voz clonada) para justificar la relevancia de la protección.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* a) Estafa mediante engaño */}
            <div className="reveal delay-100 bg-slate-900/60 backdrop-blur-sm p-6 rounded-2xl box-neon-purple flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-purple-400 block mb-2">Art. 172, CP</span>
                <h3 className="text-lg font-bold text-white mb-2">Estafa Telefónica</h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                  La voz falsificada actúa como "engaño" o ardid para inducir al error y causar perjuicio patrimonial. Aunque el medio es informático (IA), el engaño se dirige a la persona.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-purple-300/80">
                Inducción al error patrimonial
              </div>
            </div>

            {/* b) Fraude informático */}
            <div className="reveal delay-200 bg-slate-900/60 backdrop-blur-sm p-6 rounded-2xl box-neon-purple flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-purple-400 block mb-2">Art. 173 inc. 16, CP</span>
                <h3 className="text-lg font-bold text-white mb-2">Fraude Informático</h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                  Ley 26.388. Aplica si se manipulan procesos informáticos o sistemas de verificación por voz biométrica automatizados para lograr un beneficio indebido.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-purple-300/80">
                Manipulación biométrica de sistemas
              </div>
            </div>

            {/* c) Protección de datos personales */}
            <div className="reveal delay-300 bg-slate-900/60 backdrop-blur-sm p-6 rounded-2xl box-neon-purple flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-purple-400 block mb-2">Ley 25.326</span>
                <h3 className="text-lg font-bold text-white mb-2">Datos Personales</h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                  La voz de una persona identificable es un dato protegido cuyo uso exige consentimiento e información previa, aun cuando su carácter sensible no sea automático por ser biométrico.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-purple-300/80">
                Protección y consentimiento previo
              </div>
            </div>

            {/* d) Acceso indebido */}
            <div className="reveal delay-400 bg-slate-900/60 backdrop-blur-sm p-6 rounded-2xl box-neon-purple flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-purple-400 block mb-2">Art. 153 bis, CP</span>
                <h3 className="text-lg font-bold text-white mb-2">Acceso Indebido</h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                  Corresponde si la muestra de audio empleada para el entrenamiento proviene de un acceso no autorizado a un dispositivo, cuenta o sistema de comunicaciones ajeno.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-purple-300/80">
                Intrusión a sistemas ajenos
              </div>
            </div>
          </div>

          {/* Aclaración metodológica */}
          <div className="reveal mt-8 bg-purple-950/40 border border-purple-500/30 rounded-2xl p-5 text-slate-300 text-xs sm:text-sm leading-relaxed">
            <div className="flex items-start gap-3">
              <i className="fa-solid fa-scale-balanced text-purple-400 text-xl mt-0.5"></i>
              <div>
                <strong className="text-white">Aclaración metodológica:</strong> Este encuadre es conceptual y preventivo; no constituye una afirmación de que un hecho determinado haya ocurrido ni de que una persona sea penalmente responsable, sino que ilustra bajo qué figuras del derecho argentino se analizaría jurídicamente un ataque de este tipo.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Recomendaciones Prácticas (NUEVA SECCIÓN) */}
      <section id="recommendations" className="pres-section flex-col">
        <div className="reveal max-w-6xl w-full">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-semibold uppercase tracking-widest mb-3">
              <i className="fa-solid fa-lightbulb"></i> Buenas Prácticas
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              Estrategias de <span className="text-neon-blue">Mitigación</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mt-3">
              La clonación de voz bajó la barrera de entrada para estafas creíbles: la defensa más robusta no es puramente tecnológica.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* A nivel personal */}
            <div className="reveal delay-100 bg-slate-900/60 backdrop-blur-sm p-8 rounded-2xl border border-slate-700 hover:border-cyan-500/50 transition flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-6 border border-cyan-500/30 text-cyan-400">
                  <i className="fa-solid fa-user-shield text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">A nivel Personal</h3>
                <ul className="space-y-3 text-slate-300 text-sm">
                  <li className="flex items-start gap-2">
                    <i className="fa-solid fa-xmark text-red-400 mt-1"></i>
                    <span>Desconfiar de cualquier pedido urgente de dinero o datos sensibles por teléfono.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fa-solid fa-triangle-exclamation text-amber-400 mt-1"></i>
                    <span>No confiarse aunque la voz suene idéntica a la de un familiar o allegado.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fa-solid fa-check text-cyan-400 mt-1"></i>
                    <span>Cortar y verificar siempre mediante un canal alternativo preestablecido y conocido.</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-800 text-xs text-cyan-300 font-semibold">
                Pausa reflexiva ante la urgencia
              </div>
            </div>

            {/* A nivel organizacional */}
            <div className="reveal delay-200 bg-slate-900/60 backdrop-blur-sm p-8 rounded-2xl border border-slate-700 hover:border-blue-500/50 transition flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/30 text-blue-400">
                  <i className="fa-solid fa-building-shield text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">A nivel Organizacional</h3>
                <ul className="space-y-3 text-slate-300 text-sm">
                  <li className="flex items-start gap-2">
                    <i className="fa-solid fa-check text-blue-400 mt-1"></i>
                    <span>Establecer protocolos formales de verificación fuera de banda (OOB) para transferencias o cambios de clave.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fa-solid fa-check text-blue-400 mt-1"></i>
                    <span>Prohibir que órdenes sensibles se aprueben únicamente por instrucción verbal o telefónica.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fa-solid fa-check text-blue-400 mt-1"></i>
                    <span>Capacitar periódicamente al personal simulando estas nuevas modalidades de engaño con IA.</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-800 text-xs text-blue-300 font-semibold">
                Protocolos formales obligatorios
              </div>
            </div>

            {/* A nivel técnico */}
            <div className="reveal delay-300 bg-slate-900/60 backdrop-blur-sm p-8 rounded-2xl border border-slate-700 hover:border-purple-500/50 transition flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 border border-purple-500/30 text-purple-400">
                  <i className="fa-solid fa-layer-group text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">A nivel Técnico</h3>
                <ul className="space-y-3 text-slate-300 text-sm">
                  <li className="flex items-start gap-2">
                    <i className="fa-solid fa-shield text-purple-400 mt-1"></i>
                    <span>No depender de un único detector (ni acústico, ni marca de agua, ni semántico).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fa-solid fa-shield text-purple-400 mt-1"></i>
                    <span>Combinar señales en múltiples capas asumiendo que ninguna herramienta es perfecta.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="fa-solid fa-shield text-purple-400 mt-1"></i>
                    <span>Integrar telemetría y registros de auditoría de llamadas sospechosas para análisis forense.</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-800 text-xs text-purple-300 font-semibold">
                Defensa en profundidad multicapa
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Conclusión y Regla de Oro */}
      <section id="conclusion" className="pres-section flex-col text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-64 bg-cyan-500/20 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="reveal max-w-4xl z-10">
          <i className="fa-solid fa-key text-5xl text-yellow-500 mb-6"></i>
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
            La voz{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-yellow-500">
              ya no es prueba
            </span>{" "}
            de identidad.
          </h2>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            La IA permite crear voces que pueden resultar convincentes. Esto puede volver más creíbles las estafas telefónicas, pero no significa que toda voz artificial sea maliciosa.
            <br />
            Con <strong className="text-white">VoiceShield Lab</strong> mostramos el problema desde dos lados: la creación de una voz sintética autorizada y el análisis de llamadas.
          </p>

          <div className="bg-slate-900/80 p-8 rounded-2xl border border-yellow-500/30 backdrop-blur inline-block text-left shadow-[0_0_30px_rgba(234,179,8,0.12)]">
            <h3 className="text-xl font-bold text-yellow-400 uppercase tracking-wider mb-2 flex items-center gap-3">
              <i className="fa-solid fa-star"></i> La Regla de Oro
            </h3>
            <p className="text-xl sm:text-2xl text-white font-medium">
              Aunque una voz parezca conocida, verifica toda solicitud crítica por un <br />
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
