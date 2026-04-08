import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

const cookiesMock = vi.fn()
const redirectMock = vi.fn()

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}))

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  useRouter: () => ({ push: vi.fn() }),
}))

describe("AppLayout", () => {
  it("redirects unauthenticated users to login", async () => {
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    })
    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT")
    })

    const { default: AppLayout } = await import("./layout")

    await expect(async () => {
      renderToStaticMarkup(await AppLayout({ children: <div>Protected</div> }))
    }).rejects.toThrow("NEXT_REDIRECT")
    expect(redirectMock).toHaveBeenCalledWith("/login")
  })
})
