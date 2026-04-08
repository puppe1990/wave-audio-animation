import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { StepCustomize } from "./StepCustomize"
import type { AudioData, EditorConfig } from "@/types"

const AUDIO: AudioData = {
  amplitudes: new Float32Array(30).fill(0.5),
  duration: 1,
  sampleRate: 44100,
  frameCount: 30,
}

const DEFAULT_CONFIG: EditorConfig = {
  style: "bars",
  primaryColor: "#6366f1",
  backgroundColor: "#000000",
  aspectRatio: "16:9",
}

describe("StepCustomize", () => {
  it("renders all three style buttons", () => {
    render(
      <StepCustomize
        audioData={AUDIO}
        config={DEFAULT_CONFIG}
        onChange={vi.fn()}
        onNext={vi.fn()}
      />
    )

    expect(screen.getByText(/barras/i)).toBeTruthy()
    expect(screen.getByText(/linha/i)).toBeTruthy()
    expect(screen.getByText(/espelho/i)).toBeTruthy()
  })

  it("calls onChange when style changes", () => {
    const onChange = vi.fn()

    render(
      <StepCustomize
        audioData={AUDIO}
        config={DEFAULT_CONFIG}
        onChange={onChange}
        onNext={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText(/linha/i))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ style: "line" }))
  })

  it("renders aspect ratio selector", () => {
    render(
      <StepCustomize
        audioData={AUDIO}
        config={DEFAULT_CONFIG}
        onChange={vi.fn()}
        onNext={vi.fn()}
      />
    )

    expect(screen.getByText("16:9")).toBeTruthy()
    expect(screen.getByText("9:16")).toBeTruthy()
    expect(screen.getByText("1:1")).toBeTruthy()
  })
})
