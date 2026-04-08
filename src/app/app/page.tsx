"use client"

import { useState } from "react"
import { StepCustomize } from "@/components/editor/StepCustomize"
import { StepExport } from "@/components/editor/StepExport"
import { StepUpload } from "@/components/editor/StepUpload"
import type { AudioData, EditorConfig } from "@/types"

const STEPS = ["Upload", "Personalizar", "Exportar"] as const

const DEFAULT_CONFIG: EditorConfig = {
  style: "bars",
  primaryColor: "#22d3ee",
  backgroundColor: "#020617",
  aspectRatio: "16:9",
}

export default function EditorPage() {
  const [step, setStep] = useState(0)
  const [audioData, setAudioData] = useState<AudioData | null>(null)
  const [config, setConfig] = useState<EditorConfig>(DEFAULT_CONFIG)

  function handleAudioReady(data: AudioData) {
    setAudioData(data)
    setStep(1)
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-center gap-3">
        {STEPS.map((label, index) => (
          <div key={label} className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                index < step
                  ? "bg-cyan-400 text-zinc-950"
                  : index === step
                    ? "border border-cyan-400 text-cyan-300"
                    : "border border-zinc-700 text-zinc-500"
              }`}
            >
              {index + 1}
            </div>
            <span className={index === step ? "text-white" : "text-zinc-500"}>{label}</span>
          </div>
        ))}
      </div>

      {step === 0 ? <StepUpload onAudioReady={handleAudioReady} /> : null}
      {step === 1 && audioData ? (
        <StepCustomize
          audioData={audioData}
          config={config}
          onChange={setConfig}
          onNext={() => setStep(2)}
        />
      ) : null}
      {step === 2 && audioData ? <StepExport audioData={audioData} config={config} /> : null}
    </div>
  )
}
