"use client"

import { useEffect, useEffectEvent, useRef, useState } from "react"
import { drawFrame, getDimensions } from "@/lib/renderer"
import type { AudioData, EditorConfig } from "@/types"

interface Props {
  audioData: AudioData
  config:    EditorConfig
}

export function WaveformPreview({ audioData, config }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const frameRef = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [width, height] = getDimensions(config.aspectRatio)

  const renderFrame = useEffectEvent((frame: number) => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const ctx = canvas.getContext("2d")
    if (!ctx) {
      return
    }

    drawFrame(ctx, audioData.amplitudes, frame, { ...config, width, height })
  })

  useEffect(() => {
    renderFrame(frameRef.current)
  }, [audioData.amplitudes, config, width, height])

  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(rafRef.current)
      return
    }

    const fps = 30
    let last = performance.now()

    function loop(now: number) {
      const elapsed = now - last
      if (elapsed >= 1000 / fps) {
        last = now
        frameRef.current = (frameRef.current + 1) % audioData.frameCount
        renderFrame(frameRef.current)
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, audioData.frameCount, audioData.amplitudes, config, width, height])

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full rounded-xl border border-gray-700"
        style={{ aspectRatio: `${width}/${height}`, maxHeight: "50vh", objectFit: "contain" }}
      />
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        className="rounded-lg bg-cyan-400 px-6 py-2 font-medium text-zinc-950 transition hover:bg-cyan-300"
      >
        {playing ? "Pausar" : "Prévia"}
      </button>
    </div>
  )
}
