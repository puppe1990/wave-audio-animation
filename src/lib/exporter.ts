import type { AudioData, EditorConfig, ExportFormat } from "@/types"
import { drawFrame, getDimensions } from "./renderer"

export type ProgressCallback = (progress: number) => void

type RenderingContext2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

interface CanvasLike {
  width: number
  height: number
  getContext(contextId: "2d"): RenderingContext2D | null
}

interface BlobConvertibleCanvas extends CanvasLike {
  convertToBlob(options?: BlobPropertyBag): Promise<Blob>
}

interface HtmlCanvasLike extends CanvasLike {
  toBlob(
    callback: BlobCallback,
    type?: string,
    quality?: number
  ): void
}

function createOffscreenCanvas(width: number, height: number): CanvasLike {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height)
  }
  const canvas = document.createElement("canvas")
  canvas.width  = width
  canvas.height = height
  return canvas
}

function hasConvertToBlob(canvas: CanvasLike): canvas is BlobConvertibleCanvas {
  return "convertToBlob" in canvas
}

function hasToBlob(canvas: CanvasLike): canvas is HtmlCanvasLike {
  return "toBlob" in canvas
}

async function canvasToBlob(canvas: CanvasLike): Promise<Blob> {
  if (hasConvertToBlob(canvas)) {
    return canvas.convertToBlob({ type: "image/png" })
  }

  if (!hasToBlob(canvas)) {
    throw new Error("Canvas implementation does not support blob export")
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
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
  if (!ctx) {
    throw new Error("Unable to create 2D canvas context")
  }
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
