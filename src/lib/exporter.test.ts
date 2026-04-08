import { describe, it, expect, vi } from "vitest"

type MockFFmpegInstance = {
  load: ReturnType<typeof vi.fn>
  exec: ReturnType<typeof vi.fn>
  writeFile: ReturnType<typeof vi.fn>
  readFile: ReturnType<typeof vi.fn>
}

vi.mock("@ffmpeg/ffmpeg", () => ({
  FFmpeg: vi.fn().mockImplementation(function (this: MockFFmpegInstance) {
    this.load      = vi.fn().mockResolvedValue(undefined)
    this.exec      = vi.fn().mockResolvedValue(undefined)
    this.writeFile = vi.fn().mockResolvedValue(undefined)
    this.readFile  = vi.fn().mockResolvedValue(new Uint8Array([0, 1, 2]))
  }),
}))

vi.mock("@ffmpeg/util", () => ({
  toBlobURL: vi.fn().mockResolvedValue("blob:mock"),
}))

import { exportVideo } from "./exporter"
import type { AudioData, EditorConfig } from "@/types"

const AUDIO: AudioData = {
  amplitudes: new Float32Array([0.1, 0.5, 0.9, 0.3]),
  duration:   4 / 30,
  sampleRate: 44100,
  frameCount: 4,
}

const CONFIG: EditorConfig = {
  style:           "bars",
  primaryColor:    "#6366f1",
  backgroundColor: "#000000",
  aspectRatio:     "16:9",
}

describe("exportVideo", () => {
  it("returns a Blob for mp4 format", async () => {
    const result = await exportVideo(AUDIO, CONFIG, "mp4")
    expect(result).toBeInstanceOf(Blob)
    expect(result.type).toBe("video/mp4")
  })

  it("returns a Blob for gif format", async () => {
    const result = await exportVideo(AUDIO, CONFIG, "gif")
    expect(result).toBeInstanceOf(Blob)
    expect(result.type).toBe("image/gif")
  })

  it("calls onProgress with values between 0 and 1", async () => {
    const calls: number[] = []
    await exportVideo(AUDIO, CONFIG, "mp4", (p) => calls.push(p))
    expect(calls.length).toBeGreaterThan(0)
    expect(calls[calls.length - 1]).toBe(1)
    for (const v of calls) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})
