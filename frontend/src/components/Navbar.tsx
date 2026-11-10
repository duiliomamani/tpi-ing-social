"use client";

import React from "react";
import { ShieldAlert, Cpu, Activity, Presentation, Trash2 } from "lucide-react";
import { purgeLabData } from "@/lib/api";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openPresentation: () => void;
  systemOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openPresentation,
  systemOnline
}) => {
  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "generation", label: "1. Generación de Voz" },
    { id: "simulation", label: "2. Simulación Vishing" },
    { id: "detection", label: "3. Detección Acústica" },
    { id: "confidence", label: "4. Factores de Confianza" },
    { id: "experiments", label: "5. Laboratorio Comparativo" },
    { id: "conclusions", label: "6. Conclusiones y Protocolo" },
  ];

  const handlePurge = async () => {
    if (confirm("¿Desea eliminar de forma segura todas las grabaciones temporales y referencias de voz generadas en la sesión?")) {
      try {
        const res = await purgeLabData();
        alert(res.message);
      } catch (err: any) {
        alert("Error al sanear datos: " + err.message);
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-cyan-950/60 bg-cyber-900/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("dashboard")}>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-black tracking-wider text-white">VOICESHIELD</span>
              <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-cyan-400 border border-cyan-500/30">
                LAB PoC
              </span>
            </div>
            <p className="text-xs text-slate-400">Ingeniería Social Asistida por IA & Clonación de Voz</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center space-x-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,240,255,0.1)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {/* Status Indicator */}
          <div className="flex items-center space-x-2 rounded-full bg-slate-900/90 px-2.5 py-1 text-xs border border-slate-800">
            <span className={`h-2 w-2 rounded-full ${systemOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
            <span className="text-[11px] font-medium text-slate-300">
              {systemOnline ? "FastAPI Core Online" : "Servidor Local Offline"}
            </span>
          </div>

          {/* Guided Presentation Mode Button */}
          <button
            onClick={openPresentation}
            className="flex items-center space-x-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-cyan-900/40 hover:from-cyan-500 hover:to-blue-500 transition-all border border-cyan-400/30"
          >
            <Presentation className="h-3.5 w-3.5" />
            <span>Modo Presentación</span>
          </button>

          {/* Academic Privacy Data Purge */}
          <button
            onClick={handlePurge}
            title="Saneamiento Ético: Eliminar datos y grabaciones temporales"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-900/50 bg-rose-950/20 text-rose-400 hover:bg-rose-900/40 transition"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="flex lg:hidden overflow-x-auto px-4 py-2 space-x-2 border-t border-slate-800/60 bg-slate-950/80">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-2.5 py-1 text-xs rounded ${
              activeTab === tab.id ? "bg-cyan-500/20 text-cyan-300 font-bold" : "text-slate-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
  );
};
