"use client"

import { useEffect, useState } from "react"
import { exportVideo } from "@/lib/exporter"
import type { AudioData, EditorConfig, ExportFormat } from "@/types"

interface Props {
  audioData: AudioData
  config: EditorConfig
}

export function StepExport({ audioData, config }: Props) {
  const [format, setFormat] = useState<ExportFormat>("mp4")
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [blobUrl, setBlobUrl] = useState("")

  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [blobUrl])

  async function handleExport() {
    setError("")
    setProgress(0)

    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      setBlobUrl("")
    }

    try {
      const blob = await exportVideo(audioData, config, format, setProgress)
      const url = URL.createObjectURL(blob)
      setBlobUrl(url)
      setProgress(1)

      void fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          duration: Math.round(audioData.duration),
          style: config.style,
          aspectRatio: config.aspectRatio,
        }),
      }).catch(() => {})
    } catch {
      setError("Falha ao exportar. Tente novamente.")
      setProgress(null)
    }
  }

  function handleDownload() {
    if (!blobUrl) {
      return
    }

    const anchor = document.createElement("a")
    anchor.href = blobUrl
    anchor.download = `waveform.${format}`
    anchor.click()
  }

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
              className={`rounded-full px-5 py-2 text-sm font-semibold uppercase transition ${
                format === item
                  ? "bg-cyan-400 text-zinc-950"
                  : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      {progress !== null ? (
        <section>
          <p className="mb-2 text-sm text-cyan-300">Gerando vídeo... {Math.round(progress * 100)}%</p>
          <div
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 overflow-hidden rounded-full bg-zinc-800"
          >
            <div className="h-full bg-cyan-400 transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
        </section>
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={progress !== null && progress < 1}
          className="rounded-2xl bg-cyan-400 px-5 py-3 font-semibold text-zinc-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {progress !== null && progress < 1 ? "Exportando..." : "Exportar"}
        </button>

        {blobUrl ? (
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-2xl border border-zinc-700 px-5 py-3 font-semibold text-white transition hover:border-cyan-400 hover:text-cyan-300"
          >
            Baixar {format.toUpperCase()}
          </button>
        ) : null}
      </div>
    </div>
  )
}
