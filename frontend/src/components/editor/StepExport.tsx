"use client"

import { useEffect, useRef, useState } from "react"
import { createExport, getJobStatus, downloadJob, ApiError } from "@/lib/api-client"
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
      if (pollRef.current) {
        clearInterval(pollRef.current)
      }
    }
  }, [])

  function startPolling(id: string) {
    if (pollRef.current) {
      clearInterval(pollRef.current)
    }

    pollRef.current = setInterval(async () => {
      try {
        const job = await getJobStatus(id)

        setProgress(job.progress)
        setStatus(job.status)

        if (job.status === "completed") {
          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }
        } else if (job.status === "failed") {
          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }
          setError(job.error_message || "Falha ao exportar. Tente novamente.")
        }
      } catch {
        // Polling error, keep trying
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
    <div
      className={`mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-[1.5rem] border p-6 transition-all duration-500 animate-scale-in ${
        isCompleted
          ? "border-emerald-500/30 bg-emerald-950/[0.08]"
          : isFailed
            ? "border-red-500/30 bg-red-950/[0.08]"
            : "border-zinc-800/80 bg-zinc-900/40"
      }`}
    >
      {/* Format selector */}
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

      {/* File info */}
      {audioFile && (
        <section>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
            Arquivo
          </p>
          <p className="text-sm tracking-wide text-zinc-300">
            {audioFile.name}{" "}
            <span className="text-zinc-500">({(audioFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
          </p>
        </section>
      )}

      {/* Processing state */}
      {progress !== null && isProcessing && (
        <section className="grid gap-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Animated processing dots */}
              <div className="flex gap-1">
                <span className="processing-dot h-1.5 w-1.5 rounded-full bg-blue-400" />
                <span className="processing-dot h-1.5 w-1.5 rounded-full bg-blue-400" />
                <span className="processing-dot h-1.5 w-1.5 rounded-full bg-blue-400" />
              </div>
              <p className="text-sm font-medium text-zinc-200">
                Gerando video
              </p>
            </div>
            <p className="text-sm tabular-nums text-blue-400">
              {Math.round(progress)}%
            </p>
          </div>
          {/* Progress bar with gradient + shimmer */}
          <div
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-3 overflow-hidden rounded-full bg-zinc-800/80"
          >
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #22d3ee, #67e8f9, #22d3ee)",
                backgroundSize: "200% 100%",
                animation: "shimmer 3s linear infinite",
                boxShadow: "0 0 16px rgba(34, 211, 238, 0.35)",
              }}
            />
          </div>
        </section>
      )}

      {/* Completed state */}
      {isCompleted && (
        <section className="animate-scale-in">
          <div className="flex items-center gap-3">
            {/* Animated checkmark */}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#34d399"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-checkmark"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-300">Exportacao concluida!</p>
              <p className="text-xs text-zinc-500">Seu arquivo esta pronto para download.</p>
            </div>
          </div>
        </section>
      )}

      {/* Failed state */}
      {isFailed && (
        <section className="animate-fade-in">
          <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            <p className="text-sm text-red-300">{error || "Falha ao exportar. Tente novamente."}</p>
          </div>
        </section>
      )}

      {/* Error (non-failed) */}
      {error && !isFailed && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-2.5 animate-fade-in">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          <p className="text-sm tracking-wide text-red-300">{error}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        {/* Export / Primary action */}
        {!isCompleted ? (
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={isProcessing}
            className="flex-1 rounded-xl bg-cyan-400 px-5 py-3.5 font-semibold text-zinc-950 transition-all duration-200 hover:bg-cyan-300 hover:shadow-[0_0_24px_rgba(34,211,238,0.25)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? "Exportando..." : "Exportar"}
          </button>
        ) : null}

        {/* Download button (primary when completed) */}
        {isCompleted && jobId ? (
          <button
            type="button"
            onClick={() => void handleDownload()}
            className="flex-1 rounded-xl bg-cyan-400 px-5 py-3.5 font-semibold text-zinc-950 transition-all duration-200 hover:bg-cyan-300 hover:shadow-[0_0_24px_rgba(34,211,238,0.25)]"
          >
            Baixar {format.toUpperCase()}
          </button>
        ) : null}

        {/* Restart button */}
        {onRestart ? (
          <button
            type="button"
            onClick={onRestart}
            className="rounded-xl border border-zinc-800 px-5 py-3.5 font-medium text-zinc-400 transition-all duration-200 hover:border-zinc-600 hover:text-zinc-200"
          >
            Recomecar
          </button>
        ) : null}
      </div>
    </div>
  )
}
