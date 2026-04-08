import type { AspectRatio, RendererOptions } from "@/types"
import { ASPECT_RATIO_DIMENSIONS } from "@/types"

export function getDimensions(aspectRatio: AspectRatio): [number, number] {
  return ASPECT_RATIO_DIMENSIONS[aspectRatio]
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

export function drawFrame(
  ctx: Ctx,
  amplitudes: Float32Array,
  frameIndex: number,
  options: RendererOptions
): void {
  const { style, primaryColor, backgroundColor, width, height } = options

  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, width, height)

  const safeIndex = Math.min(frameIndex, amplitudes.length - 1)

  switch (style) {
    case "bars":   drawBars(ctx,   amplitudes, safeIndex, primaryColor, width, height); break
    case "line":   drawLine(ctx,   amplitudes, safeIndex, primaryColor, width, height); break
    case "mirror": drawMirror(ctx, amplitudes, safeIndex, primaryColor, width, height); break
  }
}

function drawBars(
  ctx: Ctx, amplitudes: Float32Array, frameIndex: number,
  color: string, width: number, height: number
): void {
  const barCount = 64
  const barW     = (width / barCount) * 0.6
  const gap      = (width / barCount) * 0.4
  const half     = Math.floor(barCount / 2)

  ctx.fillStyle = color
  for (let i = 0; i < barCount; i++) {
    const idx = Math.max(0, Math.min(amplitudes.length - 1, frameIndex - half + i))
    const amp = amplitudes[idx] ?? 0
    const barH = Math.max(4, amp * height * 0.85)
    const x    = i * (barW + gap) + gap / 2
    const y    = height - barH
    ctx.beginPath()
    ctx.roundRect(x, y, barW, barH, 4)
    ctx.fill()
  }
}

function drawLine(
  ctx: Ctx, amplitudes: Float32Array, frameIndex: number,
  color: string, width: number, height: number
): void {
  const points  = 120
  const half    = Math.floor(points / 2)
  const centerY = height / 2

  ctx.strokeStyle = color
  ctx.lineWidth   = Math.max(3, width / 400)
  ctx.lineCap     = "round"
  ctx.lineJoin    = "round"

  ctx.beginPath()
  for (let i = 0; i < points; i++) {
    const idx = Math.max(0, Math.min(amplitudes.length - 1, frameIndex - half + i))
    const x   = (i / (points - 1)) * width
    const y   = centerY - (amplitudes[idx] ?? 0) * height * 0.4
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  ctx.stroke()
}

function drawMirror(
  ctx: Ctx, amplitudes: Float32Array, frameIndex: number,
  color: string, width: number, height: number
): void {
  const barCount = 64
  const barW     = (width / barCount) * 0.6
  const gap      = (width / barCount) * 0.4
  const half     = Math.floor(barCount / 2)
  const centerY  = height / 2

  ctx.fillStyle = color
  for (let i = 0; i < barCount; i++) {
    const idx  = Math.max(0, Math.min(amplitudes.length - 1, frameIndex - half + i))
    const amp  = amplitudes[idx] ?? 0
    const barH = Math.max(2, amp * height * 0.42)
    const x    = i * (barW + gap) + gap / 2

    ctx.beginPath()
    ctx.roundRect(x, centerY - barH, barW, barH, 3)
    ctx.fill()

    ctx.beginPath()
    ctx.roundRect(x, centerY, barW, barH, 3)
    ctx.fill()
  }
}
