import type { AudioData, EditorConfig, ExportFormat } from "@/types"
import { drawFrame, getDimensions } from "./renderer"

export type ProgressCallback = (progress: number) => void

type AnyCanvas = { getContext(id: "2d"): any; width: number; height: number }

function createOffscreenCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height)
  }
  const canvas = document.createElement("canvas")
  canvas.width  = width
  canvas.height = height
  return canvas
}

async function canvasToBlob(canvas: AnyCanvas): Promise<Blob> {
  // OffscreenCanvas has convertToBlob; HTMLCanvasElement has toBlob
  if (typeof (canvas as any).convertToBlob === "function") {
    return (canvas as any).convertToBlob({ type: "image/png" })
  }
  return new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error("toBlob returned null"))
    }, "image/png")
  })
}

export async function exportVideo(
  audioData:   AudioData,
  config:      EditorConfig,
  format:      ExportFormat,
  onProgress?: ProgressCallback
): Promise<Blob> {
  const { FFmpeg } = await import("@ffmpeg/ffmpeg")
  const { toBlobURL } = await import("@ffmpeg/util")
  const [width, height] = getDimensions(config.aspectRatio)
  const fps             = 30
  const ffmpeg          = new FFmpeg()

  await ffmpeg.load({
    coreURL: await toBlobURL("/ffmpeg/ffmpeg-core.js",   "text/javascript"),
    wasmURL: await toBlobURL("/ffmpeg/ffmpeg-core.wasm", "application/wasm"),
  })

  const canvas = createOffscreenCanvas(width, height)
  const ctx    = canvas.getContext("2d")
  const opts   = { ...config, width, height }

  for (let i = 0; i < audioData.frameCount; i++) {
    drawFrame(ctx, audioData.amplitudes, i, opts)
    const blob        = await canvasToBlob(canvas)
    const arrayBuffer = await blob.arrayBuffer()
    await ffmpeg.writeFile(`frame${String(i).padStart(6, "0")}.png`, new Uint8Array(arrayBuffer))
    onProgress?.((i / audioData.frameCount) * 0.8)
  }

  if (format === "mp4") {
    await ffmpeg.exec([
      "-framerate", String(fps),
      "-i",         "frame%06d.png",
      "-c:v",       "libx264",
      "-pix_fmt",   "yuv420p",
      "-crf",       "23",
      "output.mp4",
    ])
    const data = await ffmpeg.readFile("output.mp4") as Uint8Array
    onProgress?.(1)
    return new Blob([(data.buffer as ArrayBuffer).slice(data.byteOffset, data.byteOffset + data.byteLength)], { type: "video/mp4" })
  } else {
    await ffmpeg.exec(["-framerate", String(fps), "-i", "frame%06d.png", "-vf", "palettegen", "palette.png"])
    await ffmpeg.exec([
      "-framerate", String(fps),
      "-i",         "frame%06d.png",
      "-i",         "palette.png",
      "-lavfi",     "paletteuse",
      "-r",         "15",
      "output.gif",
    ])
    const data = await ffmpeg.readFile("output.gif") as Uint8Array
    onProgress?.(1)
    return new Blob([(data.buffer as ArrayBuffer).slice(data.byteOffset, data.byteOffset + data.byteLength)], { type: "image/gif" })
  }
}
