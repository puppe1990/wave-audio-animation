import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { WaveformPreview } from "./WaveformPreview"
import type { AudioData, EditorConfig } from "@/types"

const AUDIO: AudioData = {
  amplitudes: new Float32Array(30).fill(0.5),
  duration:   1,
  sampleRate: 44100,
  frameCount: 30,
}

const CONFIG: EditorConfig = {
  style:           "bars",
  primaryColor:    "#6366f1",
  backgroundColor: "#000000",
  aspectRatio:     "16:9",
}

describe("WaveformPreview", () => {
  it("renders a canvas element", () => {
    render(<WaveformPreview audioData={AUDIO} config={CONFIG} />)
    expect(document.querySelector("canvas")).toBeTruthy()
  })

  it("renders play/pause button", () => {
    render(<WaveformPreview audioData={AUDIO} config={CONFIG} />)
    expect(screen.getByRole("button")).toBeTruthy()
  })
})
