"use client"

import { useState } from "react"
import { StepCustomize } from "@/components/editor/StepCustomize"
import { StepExport } from "@/components/editor/StepExport"
import { StepUpload } from "@/components/editor/StepUpload"
import type { EditorConfig } from "@/types"

interface StepDef {
  key: string
  label: string
  icon: React.FC<{ active?: boolean }>
}

function UploadIcon({ active = false }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function CustomizeIcon({ active = false }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function ExportIcon({ active = false }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

const STEPS: StepDef[] = [
  { key: "upload", label: "Upload", icon: UploadIcon },
  { key: "customize", label: "Personalizar", icon: CustomizeIcon },
  { key: "export", label: "Exportar", icon: ExportIcon },
]

const DEFAULT_CONFIG: EditorConfig = {
  style: "bars",
  primaryColor: "#22d3ee",
  backgroundColor: "#020617",
  aspectRatio: "16:9",
}

export default function EditorPage() {
  const [step, setStep] = useState(0)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [config, setConfig] = useState<EditorConfig>(DEFAULT_CONFIG)

  function handleRestart() {
    setAudioFile(null)
    setConfig(DEFAULT_CONFIG)
    setStep(0)
  }

  function handleFileSelected(file: File) {
    setAudioFile(file)
    setStep(1)
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Step indicator bar */}
      <nav className="mb-10 flex items-center justify-center" aria-label="Progresso do editor">
        <div className="flex items-center">
          {STEPS.map((s, index) => {
            const isComplete = index < step
            const isActive = index === step
            const Icon = s.icon
            return (
              <div key={s.key} className="flex items-center">
                {/* Connector line (before each step except first) */}
                {index > 0 && (
                  <div
                    className={`mx-3 h-px w-10 sm:w-14 transition-colors duration-500 ${
                      isComplete ? "bg-cyan-400/60" : "bg-zinc-800"
                    }`}
                  />
                )}

                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-300 ${
                      isComplete
                        ? "border-cyan-400 bg-cyan-400 text-zinc-950 shadow-[0_0_12px_rgba(34,211,238,0.3)]"
                        : isActive
                          ? "border-cyan-400/50 bg-cyan-950/30 text-cyan-300 ring-2 ring-cyan-400/15"
                          : "border-zinc-800 bg-zinc-900/40 text-zinc-600"
                    }`}
                  >
                    {isComplete ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <Icon active={isActive} />
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium tracking-wide transition-colors duration-300 ${
                      isActive ? "text-zinc-100" : isComplete ? "text-zinc-400" : "text-zinc-600"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </nav>

      {/* Step content with fade-in transition */}
      <div className="relative">
        {step === 0 && <StepUpload onFileSelected={handleFileSelected} />}
        {step === 1 && audioFile && (
          <StepCustomize
            audioFile={audioFile}
            config={config}
            onChange={setConfig}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && audioFile && (
          <StepExport audioFile={audioFile} config={config} onRestart={handleRestart} />
        )}
      </div>
    </div>
  )
}
