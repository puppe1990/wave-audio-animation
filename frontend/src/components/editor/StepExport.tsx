"use client"

import { useEffect, useRef, useState } from "react"
import { createExport, getJobStatus, downloadJob, ApiError } from "@/lib/api-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { EditorConfig, ExportFormat } from "@/types"

interface Props {
  audioFile: File
  config: EditorConfig
  onRestart?: () => void
}

export function StepExport({ audioFile, config, onRestart }: Props) {
  const [format, setFormat] = useState<ExportFormat>("mp4")
  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState("")
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  function startPolling(id: string) {
    if (pollRef.current) clearInterval(pollRef.current)

    pollRef.current = setInterval(async () => {
      try {
        const job = await getJobStatus(id)
        setProgress(job.progress)
        setStatus(job.status)

        if (job.status === "completed" || job.status === "failed") {
          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }

          if (job.status === "failed") {
            setError(job.error_message || "Falha ao exportar. Tente novamente.")
          }
        }
      } catch {
        // Keep polling on transient failures.
      }
    }, 2000)
  }

  async function handleExport() {
    setError("")
    setProgress(0)
    setStatus("pending")
    setJobId(null)

    try {
      const formData = new FormData()
      formData.append("audio", audioFile)
      formData.append("format", format)
      formData.append("style", config.style)
      formData.append("primary_color", config.primaryColor)
      formData.append("background_color", config.backgroundColor)
      formData.append("aspect_ratio", config.aspectRatio)

      const result = await createExport(formData)
      setJobId(result.job_id)
      startPolling(result.job_id)
    } catch (err) {
      if (err instanceof ApiError) {
        setError("Nao foi possivel iniciar a exportacao. Verifique sua conexao.")
      } else {
        setError("Falha ao exportar. Tente novamente.")
      }

      setProgress(null)
      setStatus(null)
    }
  }

  async function handleDownload() {
    if (!jobId) return

    try {
      await downloadJob(jobId)
    } catch {
      setError("Falha ao baixar o arquivo. Tente novamente.")
    }
  }

  const isCompleted = status === "completed"
  const isFailed = status === "failed"
  const isProcessing = status !== null && !isCompleted && !isFailed

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 animate-scale-in">
      <section>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
          Formato de saida
        </p>
        <div className="flex gap-2.5">
          {(["mp4", "gif"] as const).map((item) => {
            const isActive = format === item

            return (
              <button
                key={item}
                type="button"
                onClick={() => setFormat(item)}
                disabled={isProcessing}
                className={`flex-1 rounded-xl border px-5 py-3 text-sm font-semibold uppercase tracking-wider transition-all duration-200 ${
                  isActive
                    ? "border-cyan-400/40 bg-cyan-950/20 text-white ring-2 ring-cyan-400/20 ring-offset-2 ring-offset-[#020617]"
                    : "border-zinc-800/80 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/50"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {item}
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
          Arquivo
        </p>
        <p className="text-sm tracking-wide text-zinc-300">
          {audioFile.name}{" "}
          <span className="text-zinc-500">({(audioFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
        </p>
      </section>

      {progress !== null && isProcessing && (
        <section className="flex flex-col gap-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className="gap-1.5 border-cyan-400/20 bg-cyan-950/20 text-cyan-400"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
              Processando
            </Badge>
            <p className="text-sm tabular-nums text-cyan-400">{Math.round(progress)}%</p>
          </div>
          <Progress
            value={progress}
            className="h-2 bg-zinc-800 [&>div]:bg-gradient-to-r [&>div]:from-cyan-500 [&>div]:to-cyan-300 [&>div]:shadow-[0_0_12px_rgba(34,211,238,0.35)]"
          />
        </section>
      )}

      {isCompleted && (
        <section className="animate-scale-in">
          <Badge className="gap-2 border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-checkmark"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
            Exportacao concluida
          </Badge>
        </section>
      )}

      {isFailed && (
        <section className="animate-fade-in">
          <Badge
            variant="destructive"
            className="mb-2 gap-2 border-red-500/20 bg-red-500/10 text-red-300"
          >
            Falha na exportacao
          </Badge>
          <p className="text-sm text-red-300">{error || "Falha ao exportar. Tente novamente."}</p>
        </section>
      )}

      {error && !isFailed && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-2.5 animate-fade-in">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          <p className="text-sm tracking-wide text-red-300">{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        {!isCompleted && (
          <Button
            type="button"
            onClick={() => void handleExport()}
            disabled={isProcessing}
            className="flex-1 bg-cyan-400 font-semibold text-zinc-950 hover:bg-cyan-300 hover:shadow-[0_0_24px_rgba(34,211,238,0.25)] disabled:opacity-50"
          >
            {isProcessing ? "Exportando..." : "Exportar"}
          </Button>
        )}

        {isCompleted && jobId && (
          <Button
            type="button"
            onClick={() => void handleDownload()}
            className="flex-1 bg-cyan-400 font-semibold text-zinc-950 hover:bg-cyan-300 hover:shadow-[0_0_24px_rgba(34,211,238,0.25)]"
          >
            Baixar {format.toUpperCase()}
          </Button>
        )}

        {onRestart && (
          <Button
            type="button"
            variant="outline"
            onClick={onRestart}
            className="border-zinc-800 bg-transparent text-zinc-400 hover:border-zinc-600 hover:bg-transparent hover:text-zinc-200"
          >
            Recomecar
          </Button>
        )}
      </div>
    </div>
  )
}
