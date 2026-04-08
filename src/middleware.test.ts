import { describe, it, expect, vi } from "vitest"

vi.mock("@/auth", () => ({
  auth: vi.fn((handler) => handler),
}))

describe("middleware config", () => {
  it("matches /app routes only", async () => {
    const { config } = await import("./middleware")
    expect(config.matcher).toContain("/app/:path*")
  })
})
