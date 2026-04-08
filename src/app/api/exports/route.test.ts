import { describe, it, expect, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
}))

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  },
}))

vi.mock("@/db/schema", () => ({
  exports: {},
}))

import { POST } from "./route"

describe("POST /api/exports", () => {
  it("returns 201 on valid payload", async () => {
    const req = new NextRequest("http://localhost/api/exports", {
      method: "POST",
      body: JSON.stringify({
        format:      "mp4",
        duration:    30,
        style:       "bars",
        aspectRatio: "16:9",
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it("returns 401 when not authenticated", async () => {
    const { auth } = await import("@/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)

    const req = new NextRequest("http://localhost/api/exports", {
      method: "POST",
      body: JSON.stringify({ format: "mp4", duration: 30, style: "bars", aspectRatio: "16:9" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})
