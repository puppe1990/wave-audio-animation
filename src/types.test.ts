import { describe, it, expectTypeOf } from "vitest"
import type { WaveStyle, AspectRatio, ExportFormat, AudioData } from "./types"

describe("types", () => {
  it("WaveStyle covers all three styles", () => {
    expectTypeOf<WaveStyle>().toEqualTypeOf<"bars" | "line" | "mirror">()
  })

  it("AspectRatio covers all three ratios", () => {
    expectTypeOf<AspectRatio>().toEqualTypeOf<"16:9" | "9:16" | "1:1">()
  })

  it("ExportFormat covers mp4 and gif", () => {
    expectTypeOf<ExportFormat>().toEqualTypeOf<"mp4" | "gif">()
  })

  it("AudioData has expected shape", () => {
    expectTypeOf<AudioData>().toEqualTypeOf<{
      amplitudes: Float32Array
      duration: number
      sampleRate: number
      frameCount: number
    }>()
  })
})
