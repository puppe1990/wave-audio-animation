"use client"

import { type ChangeEvent, type DragEvent, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

const ACCEPTED_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/ogg",
  "audio/aac",
]

const MAX_BYTES = 50 * 1024 * 1024

interface Props {
  onFileSelected: (file: File) => void
}

function AudioWaveIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="18" width="4" height="12" rx="2" fill="currentColor" opacity="0.3" />
      <rect x="12" y="10" width="4" height="28" rx="2" fill="currentColor" opacity="0.45" />
      <rect x="20" y="14" width="4" height="20" rx="2" fill="currentColor" opacity="0.6" />
      <rect x="28" y="6" width="4" height="36" rx="2" fill="currentColor" opacity="0.75" />
      <rect x="36" y="16" width="4" height="16" rx="2" fill="currentColor" opacity="0.4" />
    </svg>
  )
}

export function StepUpload({ onFileSelected }: Props) {
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Formato invalido. Use MP3, WAV, M4A ou OGG."
    }
    if (file.size > MAX_BYTES) {
      return "Arquivo muito grande. O limite e 50 MB."
    }
    return null
  }

  function processFile(file: File) {
    setError("")

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setTimeout(() => {
      onFileSelected(file)
      setLoading(false)
    }, 300)
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)

    const file = event.dataTransfer.files[0]
    if (file) {
      processFile(file)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 animate-fade-in-up">
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        className={`group relative w-full cursor-pointer overflow-hidden rounded-[2rem] border p-14 text-center transition-all duration-300 ${
          dragging
            ? "border-cyan-400/60 bg-cyan-950/20 shadow-[0_0_40px_rgba(34,211,238,0.1)] scale-[1.02]"
            : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/60"
        }`}
      >
        {/* Ambient glow when dragging */}
        {dragging && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-cyan-500/[0.06] to-transparent" />
        )}

        <div className="relative flex flex-col items-center gap-4">
          {/* Watermark icon */}
          <div
            className={`transition-all duration-300 ${
              dragging
                ? "text-cyan-400 opacity-100 scale-110"
                : "text-zinc-700 opacity-60 group-hover:text-zinc-600 group-hover:opacity-80"
            }`}
          >
            <AudioWaveIcon />
          </div>

          {/* Primary text */}
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            Arraste o audio aqui
          </h2>

          {/* Separator line */}
          <div className={`h-px w-12 transition-colors duration-300 ${dragging ? "bg-cyan-400/60" : "bg-zinc-700"}`} />

          {/* Secondary action */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation()
              inputRef.current?.click()
            }}
            className="border-zinc-700 bg-transparent text-xs text-zinc-400 hover:border-zinc-600 hover:bg-transparent hover:text-zinc-200"
          >
            Escolher arquivo
          </Button>

          {/* Format info */}
          <p className="text-[11px] tracking-wider text-zinc-600">
            MP3, WAV, M4A, OGG — Maximo 50 MB
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Status messages */}
      {loading && (
        <div className="flex items-center gap-2 animate-fade-in">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <p className="text-sm tracking-wide text-cyan-300">Verificando audio...</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-2.5 animate-fade-in">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          <p className="text-sm tracking-wide text-red-300">{error}</p>
        </div>
      )}
    </div>
  )
}
