import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { StepUpload } from "./StepUpload"

vi.mock("@/lib/audio", () => ({
  decodeAudio: vi.fn(),
}))

describe("StepUpload", () => {
  it("renders upload area", () => {
    render(<StepUpload onAudioReady={vi.fn()} />)
    expect(screen.getByText(/arraste/i)).toBeTruthy()
  })

  it("shows error for unsupported format", async () => {
    render(<StepUpload onAudioReady={vi.fn()} />)
    const input = document.querySelector("input[type=file]") as HTMLInputElement
    const file = new File(["data"], "track.xyz", { type: "application/octet-stream" })
    Object.defineProperty(input, "files", { value: [file] })
    fireEvent.change(input)
    expect(await screen.findByText(/formato/i)).toBeTruthy()
  })

  it("shows error for file over 50MB", async () => {
    render(<StepUpload onAudioReady={vi.fn()} />)
    const input = document.querySelector("input[type=file]") as HTMLInputElement
    const big = new File([new ArrayBuffer(51 * 1024 * 1024)], "big.mp3", { type: "audio/mpeg" })
    Object.defineProperty(input, "files", { value: [big] })
    fireEvent.change(input)
    expect(await screen.findByText(/50MB/i)).toBeTruthy()
  })
})
