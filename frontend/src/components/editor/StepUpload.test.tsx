import { fireEvent, render, screen, act } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { StepUpload } from "./StepUpload"

describe("StepUpload", () => {
  it("renders upload area", () => {
    render(<StepUpload onFileSelected={vi.fn()} />)
    expect(screen.getByText(/arraste/i)).toBeTruthy()
  })

  it("shows error for unsupported format", () => {
    render(<StepUpload onFileSelected={vi.fn()} />)
    const input = document.querySelector("input[type=file]") as HTMLInputElement
    const file = new File(["data"], "track.xyz", { type: "application/octet-stream" })
    Object.defineProperty(input, "files", { value: [file] })
    fireEvent.change(input)
    expect(screen.getByText(/formato/i)).toBeTruthy()
  })

  it("shows error for file over 50MB", () => {
    render(<StepUpload onFileSelected={vi.fn()} />)
    const input = document.querySelector("input[type=file]") as HTMLInputElement
    const big = new File([new ArrayBuffer(51 * 1024 * 1024)], "big.mp3", { type: "audio/mpeg" })
    Object.defineProperty(input, "files", { value: [big] })
    fireEvent.change(input)
    expect(screen.getByText(/arquivo muito grande/i)).toBeTruthy()
  })

  it("calls onFileSelected with valid file", async () => {
    vi.useFakeTimers()
    const onFileSelected = vi.fn()
    render(<StepUpload onFileSelected={onFileSelected} />)
    const input = document.querySelector("input[type=file]") as HTMLInputElement
    const file = new File([new ArrayBuffer(1024)], "track.mp3", { type: "audio/mpeg" })
    Object.defineProperty(input, "files", { value: [file] })
    fireEvent.change(input)

    // Advance timers for the processFile setTimeout
    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    vi.useRealTimers()
    expect(onFileSelected).toHaveBeenCalledWith(file)
  })
})
