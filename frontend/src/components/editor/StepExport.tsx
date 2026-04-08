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

  // Cleanup polling on unmount
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6">
      <section>
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-zinc-500">Formato</p>
        <div className="flex gap-3">
          {(["mp4", "gif"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFormat(item)}
              disabled={isProcessing}
              className={`rounded-full px-5 py-2 text-sm font-semibold uppercase transition ${
                format === item
                  ? "bg-cyan-400 text-zinc-950"
                  : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      {audioFile && (
        <section>
          <p className="mb-2 text-xs uppercase tracking-[0.3em] text-zinc-500">Arquivo</p>
          <p className="text-sm text-zinc-300">
            {audioFile.name} ({(audioFile.size / (1024 * 1024)).toFixed(1)} MB)
          </p>
        </section>
      )}

      {progress !== null && isProcessing ? (
        <section>
          <p className="mb-2 text-sm text-cyan-300">
            Gerando video... {Math.round(progress)}%
          </p>
          <div
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 overflow-hidden rounded-full bg-zinc-800"
          >
            <div
              className="h-full bg-cyan-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>
      ) : null}

      {isCompleted && (
        <section>
          <p className="mb-2 text-sm text-green-400">Exportacao concluida!</p>
        </section>
      )}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={isProcessing}
          className="rounded-2xl bg-cyan-400 px-5 py-3 font-semibold text-zinc-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isProcessing ? "Exportando..." : "Exportar"}
        </button>

        {isCompleted && jobId ? (
          <button
            type="button"
            onClick={() => void handleDownload()}
            className="rounded-2xl border border-zinc-700 px-5 py-3 font-semibold text-white transition hover:border-cyan-400 hover:text-cyan-300"
          >
            Baixar {format.toUpperCase()}
          </button>
        ) : null}

        {onRestart ? (
          <button
            type="button"
            onClick={onRestart}
            className="rounded-2xl border border-zinc-700 px-5 py-3 font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
          >
            Recomecar
          </button>
        ) : null}
      </div>
    </div>
  )
}
