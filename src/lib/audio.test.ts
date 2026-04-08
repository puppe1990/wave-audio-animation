import { describe, it, expect } from "vitest"
import { extractAmplitudes, FRAMES_PER_SECOND } from "./audio"

// Minimal AudioBuffer mock
function makeAudioBuffer(samples: number[]): AudioBuffer {
  return {
    duration:        samples.length / 44100,
    sampleRate:      44100,
    numberOfChannels: 1,
    length:          samples.length,
    getChannelData:  () => new Float32Array(samples),
  } as unknown as AudioBuffer
}

describe("extractAmplitudes", () => {
  it("returns one amplitude value per frame", () => {
    // 1 second of audio at 44100 Hz → 30 frames at 30fps
    const samples  = new Array(44100).fill(0).map((_, i) => Math.sin(i * 0.1))
    const buffer   = makeAudioBuffer(samples)
    const result   = extractAmplitudes(buffer, FRAMES_PER_SECOND)
    expect(result.frameCount).toBe(30)
    expect(result.amplitudes.length).toBe(30)
  })

  it("normalizes amplitudes to 0–1", () => {
    const samples = [0.5, 1.0, 0.2, 0.8]
    const buffer  = makeAudioBuffer(samples)
    const result  = extractAmplitudes(buffer, FRAMES_PER_SECOND)
    const max     = Math.max(...result.amplitudes)
    expect(max).toBeCloseTo(1, 5)
    for (const v of result.amplitudes) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it("handles silent audio without dividing by zero", () => {
    const samples = new Array(44100).fill(0)
    const buffer  = makeAudioBuffer(samples)
    const result  = extractAmplitudes(buffer, FRAMES_PER_SECOND)
    for (const v of result.amplitudes) {
      expect(Number.isNaN(v)).toBe(false)
    }
  })
})
