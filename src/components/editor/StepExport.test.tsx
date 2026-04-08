import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { StepExport } from "./StepExport"
import type { AudioData, EditorConfig } from "@/types"

const AUDIO: AudioData = {
  amplitudes: new Float32Array(30).fill(0.5),
  duration: 1,
  sampleRate: 44100,
  frameCount: 30,
}

const CONFIG: EditorConfig = {
  style: "bars",
  primaryColor: "#6366f1",
  backgroundColor: "#000000",
  aspectRatio: "16:9",
}

vi.mock("@/lib/exporter", () => ({
  exportVideo: vi.fn().mockResolvedValue(new Blob(["fake"], { type: "video/mp4" })),
}))

describe("StepExport", () => {
  it("renders MP4 and GIF format buttons", () => {
    render(<StepExport audioData={AUDIO} config={CONFIG} />)
    expect(screen.getByText("MP4")).toBeTruthy()
    expect(screen.getByText("GIF")).toBeTruthy()
  })

  it("renders export button", () => {
    render(<StepExport audioData={AUDIO} config={CONFIG} />)
    expect(screen.getByRole("button", { name: /exportar/i })).toBeTruthy()
  })

  it("shows progress bar after clicking export", async () => {
    render(<StepExport audioData={AUDIO} config={CONFIG} />)
    fireEvent.click(screen.getByRole("button", { name: /exportar/i }))
    expect(await screen.findByRole("progressbar")).toBeTruthy()
  })
})
