"use client"

import { type ChangeEvent, type DragEvent, useRef, useState } from "react"
import { decodeAudio } from "@/lib/audio"
import type { AudioData } from "@/types"

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
  onAudioReady: (data: AudioData) => void
}

export function StepUpload({ onAudioReady }: Props) {
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function processFile(file: File) {
    setError("")

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Formato inválido. Use MP3, WAV, M4A ou OGG.")
      return
    }

    if (file.size > MAX_BYTES) {
      setError("Arquivo muito grande. O limite é 50MB.")
      return
    }

    setLoading(true)

    try {
      const audioData = await decodeAudio(file)
      onAudioReady(audioData)
    } catch {
      setError("Não foi possível decodificar o áudio. Tente outro arquivo.")
    } finally {
      setLoading(false)
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      void processFile(file)
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)

    const file = event.dataTransfer.files[0]
    if (file) {
      void processFile(file)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4">
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        className={`w-full cursor-pointer rounded-3xl border-2 border-dashed p-12 text-center transition ${
          dragging
            ? "border-cyan-400 bg-cyan-950/30"
            : "border-zinc-700 bg-zinc-900/70 hover:border-cyan-500"
        }`}
      >
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Upload</p>
        <p className="mt-4 text-2xl font-semibold text-white">Arraste o áudio aqui</p>
        <p className="mt-2 text-sm text-zinc-400">ou clique para selecionar</p>
        <p className="mt-6 text-xs text-zinc-500">MP3, WAV, M4A, OGG. Máximo de 50 MB.</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileChange}
        className="hidden"
      />

      {loading ? <p className="text-sm text-cyan-300">Processando áudio...</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}
