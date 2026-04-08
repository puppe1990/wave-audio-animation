import { describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const { hashMock, valuesMock } = vi.hoisted(() => ({
  hashMock: vi.fn().mockResolvedValue("hashed-password"),
  valuesMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("bcryptjs", () => ({
  default: { hash: hashMock },
}))

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: valuesMock,
    }),
  },
}))

vi.mock("@/db/schema", () => ({
  users: {},
}))

import { POST } from "./route"

describe("POST /api/register", () => {
  it("creates a user when payload is valid", async () => {
    const request = new NextRequest("http://localhost/api/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        password: "secret123",
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    expect(hashMock).toHaveBeenCalledWith("secret123", 10)
    expect(valuesMock).toHaveBeenCalled()
  })

  it("rejects invalid payloads", async () => {
    const request = new NextRequest("http://localhost/api/register", {
      method: "POST",
      body: JSON.stringify({
        email: "",
        password: "123",
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })
})
