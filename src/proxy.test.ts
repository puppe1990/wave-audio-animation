import { describe, it, expect, vi } from "vitest"

vi.mock("@/auth", () => ({
  auth: vi.fn((handler) => handler),
}))

describe("proxy config", () => {
  it("matches /app routes only", async () => {
    const { config } = await import("./proxy")
    expect(config.matcher).toContain("/app/:path*")
  })
})
