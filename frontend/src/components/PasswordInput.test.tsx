import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import PasswordInput from "./PasswordInput"

describe("PasswordInput", () => {
  it("renders the toggle button inside the field with reserved right padding", () => {
    render(
      <PasswordInput
        value=""
        onChange={vi.fn()}
        className="w-full rounded-lg border px-4 py-2"
      />,
    )

    expect(screen.getByRole("button", { name: "Show password" })).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Senha")).toHaveClass("pr-12")
  })
})
