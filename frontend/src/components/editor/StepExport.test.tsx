import { fireEvent, render, screen, act } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { StepExport } from "./StepExport"
import type { EditorConfig } from "@/types"

const CONFIG: EditorConfig = {
  style: "bars",
  primaryColor: "#6366f1",
  backgroundColor: "#000000",
  aspectRatio: "16:9",
}

const AUDIO_FILE = new File([new ArrayBuffer(1024)], "track.mp3", { type: "audio/mpeg" })

const { createExportMock, getJobStatusMock, downloadJobMock } = vi.hoisted(() => ({
  createExportMock: vi.fn(),
  getJobStatusMock: vi.fn(),
  downloadJobMock: vi.fn(),
}))

vi.mock("@/lib/api-client", () => ({
  createExport: createExportMock,
  getJobStatus: getJobStatusMock,
  downloadJob: downloadJobMock,
  ApiError: class ApiError extends Error {
    constructor(message: string, public status: number) {
      super(message)
    }
  },
}))

describe("StepExport", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    createExportMock.mockReset()
    getJobStatusMock.mockReset()
    downloadJobMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders MP4 and GIF format buttons", () => {
    render(<StepExport audioFile={AUDIO_FILE} config={CONFIG} />)
    expect(screen.getByRole("button", { name: "mp4" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "gif" })).toBeTruthy()
  })

  it("renders export button", () => {
    render(<StepExport audioFile={AUDIO_FILE} config={CONFIG} />)
    expect(screen.getByRole("button", { name: /exportar/i })).toBeTruthy()
  })

  it("shows file name and size", () => {
    render(<StepExport audioFile={AUDIO_FILE} config={CONFIG} />)
    expect(screen.getByText(/track\.mp3/)).toBeTruthy()
  })

  it("shows progress bar after clicking export", async () => {
    createExportMock.mockResolvedValue({ job_id: "job-123", status: "pending" })
    getJobStatusMock.mockResolvedValue({
      job_id: "job-123",
      status: "processing",
      progress: 50,
      error_message: null,
      format: "mp4",
      style: "bars",
      aspect_ratio: "16:9",
      duration: 30,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:01Z",
    })

    render(<StepExport audioFile={AUDIO_FILE} config={CONFIG} />)
    fireEvent.click(screen.getByRole("button", { name: /exportar/i }))

    // Advance timers to trigger the poll
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500)
    })

    expect(screen.getByRole("progressbar")).toBeTruthy()
    expect(screen.getByText(/50%/i)).toBeTruthy()
  })

  it("shows download button after completed status from backend payload", async () => {
    createExportMock.mockResolvedValue({ job_id: "job-123", status: "pending" })
    getJobStatusMock.mockResolvedValue({
      job_id: "job-123",
      status: "completed",
      progress: 100,
      error_message: null,
      format: "mp4",
      style: "bars",
      aspect_ratio: "16:9",
      duration: 30,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:01Z",
    })

    render(<StepExport audioFile={AUDIO_FILE} config={CONFIG} />)
    fireEvent.click(screen.getByRole("button", { name: /exportar/i }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500)
    })

    expect(screen.getByRole("button", { name: /baixar mp4/i })).toBeTruthy()
  })

  it("calls onRestart when restart button is clicked", () => {
    const onRestart = vi.fn()

    render(<StepExport audioFile={AUDIO_FILE} config={CONFIG} onRestart={onRestart} />)
    fireEvent.click(screen.getByRole("button", { name: /recomecar/i }))

    expect(onRestart).toHaveBeenCalledTimes(1)
  })
})
