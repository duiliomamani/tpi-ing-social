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
  const [demoAudio, setDemoAudio] = useState<{ filename: string; transcript: string } | null>(null);

  useEffect(() => {
    const checkStatus = () => {
      fetchHealth()
        .then((data) => {
          setHealth(data);
          setSystemOnline(true);
        })
        .catch(() => {
          setHealth(null);
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
          onDataPurged={() => {
            setDemoAudio(null);
            setActiveTab("dashboard");
          }}
        />

        <main className="mx-auto max-w-7xl px-4 py-8">
          {activeTab === "dashboard" && (
            <DashboardTab health={health} onNavigate={setActiveTab} />
          )}
          {activeTab === "generation" && (
            <GenerationLabTab
              onAnalyzeGeneratedAudio={(filename, transcript) => {
                setDemoAudio({ filename, transcript });
                setActiveTab("detection");
              }}
            />
          )}
          {activeTab === "detection" && (
            <AcousticDetectionTab
              initialSampleName={demoAudio?.filename}
              initialTranscript={demoAudio?.transcript}
              onEvaluateAudio={(filename, transcript) => {
                setDemoAudio({ filename, transcript });
                setActiveTab("confidence");
              }}
            />
          )}
          {activeTab === "confidence" && (
            <ConfidenceMatrixTab
              initialSampleName={demoAudio?.filename}
              initialTranscript={demoAudio?.transcript}
            />
          )}
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
              "Clonación de voz autorizada, análisis forense de audio y evaluación defensiva de riesgo"
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
