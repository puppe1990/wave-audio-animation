import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import EditorPage from "./page"

vi.mock("@/components/editor/StepUpload", () => ({
  StepUpload: ({ onFileSelected }: { onFileSelected: (f: File) => void }) => (
    <div>
      <span>Upload Step</span>
      <button
        onClick={() =>
          onFileSelected(new File([""], "test.mp3", { type: "audio/mpeg" }))
        }
      >
        Mock Select
      </button>
    </div>
  ),
}))

vi.mock("@/components/editor/StepCustomize", () => ({
  StepCustomize: ({ onNext }: { onNext: () => void }) => (
    <div>
      <span>Customize Step</span>
      <button onClick={onNext}>Mock Next</button>
    </div>
  ),
}))

vi.mock("@/components/editor/StepExport", () => ({
  StepExport: ({ onRestart }: { onRestart: () => void }) => (
    <div>
      <span>Export Step</span>
      <button onClick={onRestart}>Mock Restart</button>
    </div>
  ),
}))

describe("EditorPage", () => {
  it("renders Upload step by default", () => {
    render(<EditorPage />)
    expect(screen.getByText("Upload Step")).toBeTruthy()
  })

  it("renders 3 tab triggers", () => {
    render(<EditorPage />)
    expect(screen.getByRole("tab", { name: /upload/i })).toBeTruthy()
    expect(screen.getByRole("tab", { name: /personalizar/i })).toBeTruthy()
    expect(screen.getByRole("tab", { name: /exportar/i })).toBeTruthy()
  })

  it("future step tabs are disabled", () => {
    render(<EditorPage />)
    const customizeTab = screen.getByRole("tab", { name: /personalizar/i })
    const exportTab = screen.getByRole("tab", { name: /exportar/i })
    expect(customizeTab.getAttribute("disabled") !== null || customizeTab.getAttribute("data-disabled") !== null).toBe(true)
    expect(exportTab.getAttribute("disabled") !== null || exportTab.getAttribute("data-disabled") !== null).toBe(true)
  })

  it("advances to Customize after file selected", () => {
    render(<EditorPage />)
    fireEvent.click(screen.getByText("Mock Select"))
    expect(screen.getByText("Customize Step")).toBeTruthy()
  })

  it("shows file name badge after file selected", () => {
    render(<EditorPage />)
    fireEvent.click(screen.getByText("Mock Select"))
    expect(screen.getByText(/test\.mp3/)).toBeTruthy()
  })

  it("advances to Export after clicking next on Customize", () => {
    render(<EditorPage />)
    fireEvent.click(screen.getByText("Mock Select"))
    fireEvent.click(screen.getByText("Mock Next"))
    expect(screen.getByText("Export Step")).toBeTruthy()
  })

  it("resets to Upload after restart", () => {
    render(<EditorPage />)
    fireEvent.click(screen.getByText("Mock Select"))
    fireEvent.click(screen.getByText("Mock Next"))
    fireEvent.click(screen.getByText("Mock Restart"))
    expect(screen.getByText("Upload Step")).toBeTruthy()
  })

  it("shows step indicator text", () => {
    render(<EditorPage />)
    expect(screen.getByText(/step 1 de 3/i)).toBeTruthy()
  })
})
