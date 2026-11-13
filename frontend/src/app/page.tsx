"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { DashboardTab } from "@/components/DashboardTab";
import { GenerationLabTab } from "@/components/GenerationLabTab";
import { AcousticDetectionTab } from "@/components/AcousticDetectionTab";
import { ConfidenceMatrixTab } from "@/components/ConfidenceMatrixTab";
import { ExperimentsLabTab } from "@/components/ExperimentsLabTab";
import { ConclusionsTab } from "@/components/ConclusionsTab";
import { PresentationModeModal } from "@/components/PresentationModeModal";
import { fetchHealth } from "@/lib/api";
import {
  AudioAnalysisResponse,
  DemoSessionReport,
  ExperimentResult,
  MultilayerRiskAssessmentResponse,
  SystemHealthResponse,
  VoiceGenerationResponse,
} from "@/lib/types";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [visitedTabs, setVisitedTabs] = useState<string[]>(["dashboard"]);
  const [sessionVersion, setSessionVersion] = useState(0);
  const [localOperationBusy, setLocalOperationBusy] = useState(false);
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [systemOnline, setSystemOnline] = useState(false);
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [demoAudio, setDemoAudio] = useState<{ filename: string; transcript: string } | null>(null);
  const [sessionReport, setSessionReport] = useState<DemoSessionReport>(() => ({
    schema_version: 1,
    exported_at: new Date().toISOString(),
  }));

  const navigateToTab = (tab: string) => {
    setVisitedTabs((current) => current.includes(tab) ? current : [...current, tab]);
    setActiveTab(tab);
  };

  const handleLocalOperationBusy = useCallback((busy: boolean) => setLocalOperationBusy(busy), []);

  const updateSessionReport = (partial: Partial<DemoSessionReport>) => {
    setSessionReport((current) => ({
      ...current,
      ...partial,
      schema_version: 1,
      exported_at: new Date().toISOString(),
    }));
  };

  const exportSessionReport = () => {
    const hasResults = Boolean(
      sessionReport.generated_voice || sessionReport.acoustic_analysis ||
      sessionReport.risk_assessment || sessionReport.experiment
    );
    if (!hasResults) return;
    const report = { ...sessionReport, exported_at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `voiceshield-session-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const captureGeneration = (result: VoiceGenerationResponse, context: {
    text: string;
    referenceTranscript: string;
    speakerAlias: string;
    cfgStrength: number;
    nfeStep: number;
    speed: number;
  }) => {
    updateSessionReport({
      generated_voice: {
        captured_at: new Date().toISOString(),
        result,
        text: context.text,
        reference_transcript: context.referenceTranscript,
        speaker_alias: context.speakerAlias,
        parameters: { cfg_strength: context.cfgStrength, nfe_step: context.nfeStep, speed: context.speed },
      },
    });
  };

  const captureAcousticAnalysis = (result: AudioAnalysisResponse) => {
    updateSessionReport({
      acoustic_analysis: {
        captured_at: new Date().toISOString(),
        audio_id: result.audio_id,
        filename: result.filename,
        acoustic_detection: result.acoustic_detection,
        watermark_detection: result.watermark_detection,
        overall_acoustic_summary: result.overall_acoustic_summary,
        visualization_summary: {
          sample_rate: result.visualization.sample_rate,
          duration: result.visualization.duration,
          channels: result.visualization.channels,
        },
      },
    });
  };

  const captureRiskAssessment = (result: MultilayerRiskAssessmentResponse) => {
    updateSessionReport({ risk_assessment: { captured_at: new Date().toISOString(), result } });
  };

  const captureExperiment = (result: ExperimentResult) => {
    updateSessionReport({ experiment: { captured_at: new Date().toISOString(), result } });
  };

  const reportAvailable = Boolean(
    sessionReport.generated_voice || sessionReport.acoustic_analysis ||
    sessionReport.risk_assessment || sessionReport.experiment
  );

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

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }, [activeTab]);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-black text-slate-100">
      <div>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-cyan-400 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-black"
        >
          Ir al contenido principal
        </a>
        <Navbar
          activeTab={activeTab}
          setActiveTab={navigateToTab}
          openPresentation={() => setPresentationOpen(true)}
          systemOnline={systemOnline}
          reportAvailable={reportAvailable}
          onExportReport={exportSessionReport}
          localOperationBusy={localOperationBusy}
          onDataPurged={() => {
            setDemoAudio(null);
            setSessionReport({ schema_version: 1, exported_at: new Date().toISOString() });
            setActiveTab("dashboard");
            setVisitedTabs(["dashboard"]);
            setLocalOperationBusy(false);
            setSessionVersion((current) => current + 1);
          }}
        />

        <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-8 focus:outline-none">
          {visitedTabs.includes("dashboard") && (
            <div hidden={activeTab !== "dashboard"}>
              <DashboardTab key={`dashboard-${sessionVersion}`} health={health} onNavigate={navigateToTab} />
            </div>
          )}
          {visitedTabs.includes("generation") && (
            <div hidden={activeTab !== "generation"}>
              <GenerationLabTab
                key={`generation-${sessionVersion}`}
                isActive={activeTab === "generation"}
                onBusyChange={handleLocalOperationBusy}
                onGenerationComplete={captureGeneration}
                onAnalyzeGeneratedAudio={(filename, transcript) => {
                  setDemoAudio({ filename, transcript });
                  navigateToTab("detection");
                }}
              />
            </div>
          )}
          {visitedTabs.includes("detection") && (
            <div hidden={activeTab !== "detection"}>
              <AcousticDetectionTab
                key={`detection-${sessionVersion}`}
                isActive={activeTab === "detection"}
                initialSampleName={demoAudio?.filename}
                initialTranscript={demoAudio?.transcript}
                onAnalysisComplete={captureAcousticAnalysis}
                onEvaluateAudio={(filename, transcript) => {
                  setDemoAudio({ filename, transcript });
                  navigateToTab("confidence");
                }}
              />
            </div>
          )}
          {visitedTabs.includes("confidence") && (
            <div hidden={activeTab !== "confidence"}>
              <ConfidenceMatrixTab
                key={`confidence-${sessionVersion}`}
                initialSampleName={demoAudio?.filename}
                initialTranscript={demoAudio?.transcript}
                onAssessmentComplete={captureRiskAssessment}
              />
            </div>
          )}
          {visitedTabs.includes("experiments") && (
            <div hidden={activeTab !== "experiments"}>
              <ExperimentsLabTab key={`experiments-${sessionVersion}`} onExperimentComplete={captureExperiment} />
            </div>
          )}
          {visitedTabs.includes("conclusions") && (
            <div hidden={activeTab !== "conclusions"}>
              <ConclusionsTab key={`conclusions-${sessionVersion}`} />
            </div>
          )}
        </main>
      </div>

      {/* Presentation Mode Stepper Modal */}
      <PresentationModeModal
        isOpen={presentationOpen}
        onClose={() => setPresentationOpen(false)}
        onJumpToTab={(tab) => {
          navigateToTab(tab);
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
