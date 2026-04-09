"use client"

import { useState } from "react"
import { StepCustomize } from "@/components/editor/StepCustomize"
import { StepExport } from "@/components/editor/StepExport"
import { StepUpload } from "@/components/editor/StepUpload"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { EditorConfig } from "@/types"

const STEP_KEYS = ["upload", "customize", "export"] as const
type StepKey = (typeof STEP_KEYS)[number]

const STEP_LABELS: Record<StepKey, string> = {
  upload: "Upload",
  customize: "Personalizar",
  export: "Exportar",
}

const DEFAULT_CONFIG: EditorConfig = {
  style: "bars",
  primaryColor: "#22d3ee",
  backgroundColor: "#020617",
  aspectRatio: "16:9",
}

function StepIndicator({
  index,
  isComplete,
  isActive,
}: {
  index: number
  isComplete: boolean
  isActive: boolean
}) {
  if (isComplete) {
    return (
      <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-zinc-700 text-[10px] text-zinc-300">
        ✓
      </span>
    )
  }
  return (
    <span
      className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border text-[10px] ${
        isActive
          ? "border-cyan-400 bg-cyan-950/40 text-cyan-400"
          : "border-zinc-700 bg-zinc-900 text-zinc-500"
      }`}
    >
      {index + 1}
    </span>
  )
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

  function handleTabChange(value: string) {
    const idx = STEP_KEYS.indexOf(value as StepKey)
    if (idx !== -1 && idx <= step) {
      setStep(idx)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Card className="overflow-hidden border-zinc-800 bg-zinc-900/40">
        <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-zinc-800 pb-4">
          <div>
            <p className="text-sm font-semibold text-zinc-100">Criar animação</p>
            <p className="mt-0.5 text-xs text-zinc-500">Personalize e exporte sua waveform</p>
          </div>
          {audioFile && (
            <Badge
              variant="outline"
              className="gap-1.5 border-cyan-400/20 bg-cyan-950/20 text-cyan-400"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              {audioFile.name} · {(audioFile.size / (1024 * 1024)).toFixed(1)} MB
            </Badge>
          )}
        </CardHeader>

        <Tabs value={STEP_KEYS[step]} onValueChange={handleTabChange}>
          <div className="border-b border-zinc-800 px-6">
            <TabsList className="h-auto gap-0 rounded-none bg-transparent p-0">
              {STEP_KEYS.map((key, index) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  disabled={index > step}
                  className="gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-zinc-500 data-[state=active]:border-cyan-400 data-[state=active]:bg-transparent data-[state=active]:text-cyan-400 disabled:opacity-40"
                >
                  <StepIndicator
                    index={index}
                    isComplete={index < step}
                    isActive={index === step}
                  />
                  {STEP_LABELS[key]}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <CardContent className="p-0">
            <TabsContent value="upload" className="m-0 p-6 focus-visible:outline-none">
              <StepUpload onFileSelected={handleFileSelected} />
            </TabsContent>
            <TabsContent value="customize" className="m-0 p-6 focus-visible:outline-none">
              {audioFile && (
                <StepCustomize
                  config={config}
                  onChange={setConfig}
                  onNext={() => setStep(2)}
                />
              )}
            </TabsContent>
            <TabsContent value="export" className="m-0 p-6 focus-visible:outline-none">
              {audioFile && (
                <StepExport
                  audioFile={audioFile}
                  config={config}
                  onRestart={handleRestart}
                />
              )}
            </TabsContent>
          </CardContent>
        </Tabs>

        <CardFooter className="flex items-center justify-between border-t border-zinc-800 px-6 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="text-zinc-500 hover:bg-transparent hover:text-zinc-300"
          >
            ← Voltar
          </Button>
          <span className="text-xs text-zinc-600">Step {step + 1} de 3</span>
        </CardFooter>
      </Card>
    </div>
  )
}
