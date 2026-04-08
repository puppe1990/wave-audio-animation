import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { AppHeaderActions } from "./AppHeaderActions"

const { signOutMock } = vi.hoisted(() => ({
  signOutMock: vi.fn(),
}))

vi.mock("next-auth/react", () => ({
  signOut: signOutMock,
}))

describe("AppHeaderActions", () => {
  it("renders the signed-in user name", () => {
    render(<AppHeaderActions user={{ name: "Teste Wave", email: "teste@example.com" }} />)

    expect(screen.getByText("Teste Wave")).toBeTruthy()
  })

  it("falls back to email when name is missing", () => {
    render(<AppHeaderActions user={{ email: "teste@example.com" }} />)

    expect(screen.getByText("teste@example.com")).toBeTruthy()
  })

  it("calls signOut with the login callback url", () => {
    render(<AppHeaderActions user={{ name: "Teste Wave", email: "teste@example.com" }} />)

    fireEvent.click(screen.getByRole("button", { name: /sair/i }))
    expect(signOutMock).toHaveBeenCalledWith({ callbackUrl: "/login" })
  })
})
