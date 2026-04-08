import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { AppHeaderActions } from "./AppHeaderActions"

const { logoutMock } = vi.hoisted(() => ({
  logoutMock: vi.fn(),
}))

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    token: "fake-token",
    isAuthenticated: true,
    setToken: vi.fn(),
    logout: logoutMock,
  }),
}))

const { useRouterMock } = vi.hoisted(() => ({
  useRouterMock: { push: vi.fn() },
}))

vi.mock("next/navigation", () => ({
  useRouter: () => useRouterMock,
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

  it("calls logout and redirects on logout button click", () => {
    render(<AppHeaderActions user={{ name: "Teste Wave", email: "teste@example.com" }} />)

    fireEvent.click(screen.getByRole("button", { name: /sair/i }))
    expect(logoutMock).toHaveBeenCalledTimes(1)
    expect(useRouterMock.push).toHaveBeenCalledWith("/login")
  })
})
