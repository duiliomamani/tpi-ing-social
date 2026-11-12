"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { DashboardTab } from "@/components/DashboardTab";
import { GenerationLabTab } from "@/components/GenerationLabTab";
import { AcousticDetectionTab } from "@/components/AcousticDetectionTab";
import { ConfidenceMatrixTab } from "@/components/ConfidenceMatrixTab";
import { ExperimentsLabTab } from "@/components/ExperimentsLabTab";
import { ConclusionsTab } from "@/components/ConclusionsTab";
import { PresentationModeModal } from "@/components/PresentationModeModal";
import { fetchHealth } from "@/lib/api";
import { SystemHealthResponse } from "@/lib/types";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [systemOnline, setSystemOnline] = useState(false);
  const [presentationOpen, setPresentationOpen] = useState(false);

  useEffect(() => {
    const checkStatus = () => {
      fetchHealth()
        .then((data) => {
          setHealth(data);
          setSystemOnline(true);
        })
        .catch(() => {
          setSystemOnline(false);
        });
    };

    checkStatus();
    const interval = setInterval(checkStatus, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-black text-slate-100">
      <div>
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          openPresentation={() => setPresentationOpen(true)}
          systemOnline={systemOnline}
        />

        <main className="mx-auto max-w-7xl px-4 py-8">
          {activeTab === "dashboard" && (
            <DashboardTab health={health} onNavigate={setActiveTab} />
          )}
          {activeTab === "generation" && <GenerationLabTab />}
          {activeTab === "detection" && <AcousticDetectionTab />}
          {activeTab === "confidence" && <ConfidenceMatrixTab />}
          {activeTab === "experiments" && <ExperimentsLabTab />}
          {activeTab === "conclusions" && <ConclusionsTab />}
        </main>
      </div>

      {/* Presentation Mode Stepper Modal */}
      <PresentationModeModal
        isOpen={presentationOpen}
        onClose={() => setPresentationOpen(false)}
        onJumpToTab={(tab) => {
          setActiveTab(tab);
        }}
      />

      {/* Academic Citation Footer */}
      <footer className="border-t border-slate-900 bg-cyber-900/80 py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-left">
            <span className="font-bold text-slate-300">VoiceShield Lab</span> — Proof of Concept Universitaria
            <p className="text-[11px] text-slate-500 mt-0.5">
              "Ingeniería social asistida por IA: clonación de voz (vishing) y detección de llamadas fraudulentas"
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-500 font-mono">
            Licenciatura en Seguridad Informática • Inferencia Local (Zero-Cloud / Ética Controlada)
          </div>
        </div>
      </footer>
    </div>
  );
}
