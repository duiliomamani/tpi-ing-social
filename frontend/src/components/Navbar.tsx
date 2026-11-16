"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, ShieldAlert, Presentation, Trash2, FileDown } from "lucide-react";
import { purgeLabData } from "@/lib/api";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openPresentation: () => void;
  systemOnline: boolean;
  onDataPurged: () => void;
  reportAvailable: boolean;
  onExportReport: () => void;
  localOperationBusy: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openPresentation,
  systemOnline,
  onDataPurged,
  reportAvailable,
  onExportReport,
  localOperationBusy
}) => {
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const primaryTabs = [
    { id: "dashboard", label: "Inicio" },
    { id: "generation", label: "1. Voz" },
    { id: "simulation", label: "2. Sala de llamadas" },
    { id: "detection", label: "3. Análisis acústico" },
    { id: "confidence", label: "4. Evaluación de riesgo" },
  ];
  const secondaryTabs = [
    { id: "experiments", label: "Benchmark experimental" },
    { id: "conclusions", label: "Protocolo y conclusiones" },
  ];

  useEffect(() => {
    setMobileMoreOpen(false);
  }, [activeTab]);

  const handlePurge = async () => {
    if (localOperationBusy) return;
    if (confirm("¿Eliminar cargas, clones de esta sesión, derivados experimentales, grabaciones C/D registradas y metadatos locales?")) {
      try {
        const res = await purgeLabData();
        onDataPurged();
        alert([res.message, res.scope_note].filter(Boolean).join("\n\n"));
      } catch (err: any) {
        alert("Error al sanear datos: " + err.message);
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-cyan-950/60 bg-cyber-900/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3">
        {/* Brand */}
        <button
          type="button"
          aria-label="Volver al inicio de VoiceShield Lab"
          onClick={() => setActiveTab("dashboard")}
          className="flex shrink-0 items-center space-x-2 text-left sm:space-x-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="whitespace-nowrap text-sm font-black tracking-[0.1em] text-white sm:text-base">VOICESHIELD</span>
              <span className="hidden rounded border border-cyan-500/30 bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-cyan-400 sm:inline">
                LAB PoC
              </span>
            </div>
            <p className="hidden whitespace-nowrap text-[10px] text-slate-400 sm:block">Voz y análisis acústico local</p>
          </div>
        </button>

        {/* Navigation Tabs */}
        <nav className="hidden items-center space-x-0.5 xl:flex">
          {primaryTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,240,255,0.1)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
          <MoreNavigationMenu items={secondaryTabs} activeTab={activeTab} setActiveTab={setActiveTab} />
        </nav>

        {/* Action Controls */}
        <div className="flex shrink-0 items-center space-x-2 sm:space-x-3">
          {/* Status Indicator */}
          <div className="flex items-center space-x-2 rounded-full border border-slate-800 bg-slate-900/90 px-2 py-1 text-xs sm:px-2.5">
            <span className={`h-2 w-2 rounded-full ${systemOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
            <span className="hidden text-[11px] font-medium text-slate-300 sm:inline">
              {systemOnline ? "FastAPI Core Online" : "Servidor Local Offline"}
            </span>
          </div>

          <button
            type="button"
            onClick={onExportReport}
            disabled={!reportAvailable}
            aria-label="Descargar informe local de la sesión"
            title={reportAvailable ? "Descargar JSON local con resultados y transcripciones de la sesión" : "Todavía no hay resultados para exportar"}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-900/60 bg-cyan-950/30 text-cyan-300 transition hover:bg-cyan-900/50 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <FileDown className="h-4 w-4" />
          </button>

          {/* Guided Presentation Mode Button */}
          <button
            onClick={openPresentation}
            title="Abrir presentación interactiva de VoiceShield Lab"
            className="flex items-center space-x-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-cyan-900/40 hover:from-cyan-500 hover:to-blue-500 transition-all border border-cyan-400/30"
          >
            <Presentation className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Modo Presentación</span>
          </button>

          {/* Academic Privacy Data Purge */}
          <button
            onClick={handlePurge}
            disabled={localOperationBusy}
            aria-label="Limpiar datos temporales del laboratorio"
            title={localOperationBusy ? "Esperá a que termine la operación de audio antes de limpiar los datos" : "Eliminar archivos temporales y datos de sesión"}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-900/50 bg-rose-950/20 text-rose-400 transition hover:bg-rose-900/40 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="border-t border-slate-800/60 bg-slate-950/80 xl:hidden">
        <div className="flex space-x-2 overflow-x-auto px-4 py-2">
          {primaryTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={`whitespace-nowrap rounded px-2.5 py-1 text-xs ${
                activeTab === tab.id ? "bg-cyan-500/20 font-bold text-cyan-300" : "text-slate-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            type="button"
            aria-expanded={mobileMoreOpen}
            aria-controls="more-navigation-mobile"
            onClick={() => setMobileMoreOpen((value) => !value)}
            className={`inline-flex shrink-0 items-center gap-1 rounded px-2.5 py-1 text-xs ${
              secondaryTabs.some((tab) => tab.id === activeTab) || mobileMoreOpen
                ? "bg-cyan-500/20 font-bold text-cyan-300"
                : "text-slate-400"
            }`}
          >
            Más <ChevronDown className={`h-3.5 w-3.5 transition-transform ${mobileMoreOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
        {mobileMoreOpen && (
          <div id="more-navigation-mobile" className="flex flex-wrap gap-2 px-4 pb-3" aria-label="Herramientas complementarias">
            {secondaryTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-current={activeTab === tab.id ? "page" : undefined}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg border px-3 py-2 text-xs ${
                  activeTab === tab.id
                    ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-200"
                    : "border-slate-700 bg-slate-900 text-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};

interface MoreNavigationMenuProps {
  items: { id: string; label: string }[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

function MoreNavigationMenu({ items, activeTab, setActiveTab }: MoreNavigationMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = "more-navigation-desktop";
  const selected = items.some((item) => item.id === activeTab);

  useEffect(() => {
    setOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (!open) return;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
          selected || open
            ? "border border-cyan-500/30 bg-cyan-500/15 text-cyan-300"
            : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
        }`}
      >
        Más <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          id={menuId}
          className="absolute right-0 top-full z-50 mt-2 min-w-56 rounded-xl border border-slate-700 bg-slate-950 p-1.5 shadow-2xl"
          aria-label="Herramientas complementarias"
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={activeTab === item.id ? "page" : undefined}
              onClick={() => {
                setActiveTab(item.id);
                setOpen(false);
              }}
              className={`block w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                activeTab === item.id ? "bg-cyan-500/15 font-semibold text-cyan-200" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
