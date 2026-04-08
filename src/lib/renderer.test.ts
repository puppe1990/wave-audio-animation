import { describe, it, expect, vi } from "vitest"
import { drawFrame, getDimensions } from "./renderer"
import type { RendererOptions } from "@/types"

const BASE_OPTIONS: RendererOptions = {
  style:           "bars",
  primaryColor:    "#6366f1",
  backgroundColor: "#000000",
  aspectRatio:     "16:9",
  width:           1920,
  height:          1080,
}

const AMPLITUDES = new Float32Array(60).fill(0).map((_, i) => (i % 10) / 10)

function makeCtx() {
  const canvas = document.createElement("canvas")
  canvas.width  = 1920
  canvas.height = 1080
  return canvas.getContext("2d")!
}

describe("getDimensions", () => {
  it("returns correct dimensions for 16:9", () => {
    expect(getDimensions("16:9")).toEqual([1920, 1080])
  })
  it("returns correct dimensions for 9:16", () => {
    expect(getDimensions("9:16")).toEqual([1080, 1920])
  })
  it("returns correct dimensions for 1:1", () => {
    expect(getDimensions("1:1")).toEqual([1080, 1080])
  })
})

describe("drawFrame", () => {
  it("calls fillRect for background on every draw", () => {
    const ctx = makeCtx()
    const fillRectSpy = vi.spyOn(ctx, "fillRect")
    drawFrame(ctx, AMPLITUDES, 0, BASE_OPTIONS)
    expect(fillRectSpy).toHaveBeenCalledWith(0, 0, 1920, 1080)
  })

  it("draws without throwing for all styles", () => {
    const ctx = makeCtx()
    for (const style of ["bars", "line", "mirror"] as const) {
      expect(() =>
        drawFrame(ctx, AMPLITUDES, 30, { ...BASE_OPTIONS, style })
      ).not.toThrow()
    }
  })

  it("clamps frameIndex to valid range", () => {
    const ctx = makeCtx()
    expect(() =>
      drawFrame(ctx, AMPLITUDES, 9999, BASE_OPTIONS)
    ).not.toThrow()
  })
})
