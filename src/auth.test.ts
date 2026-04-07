import { describe, it, expect, vi } from "vitest"

// Must mock DB dependencies before importing auth
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(null),
        }),
      }),
    }),
  },
}))

vi.mock("@/db/schema", () => ({ users: {} }))

// Mock next-auth to avoid next/server resolution issues in test environment
vi.mock("next-auth", () => {
  const mockAuth = vi.fn()
  const mockHandlers = { GET: vi.fn(), POST: vi.fn() }
  const mockSignIn = vi.fn()
  const mockSignOut = vi.fn()
  return {
    default: vi.fn(() => ({
      handlers: mockHandlers,
      auth: mockAuth,
      signIn: mockSignIn,
      signOut: mockSignOut,
    })),
  }
})

vi.mock("next-auth/providers/google", () => ({ default: vi.fn() }))
vi.mock("next-auth/providers/credentials", () => ({ default: vi.fn() }))
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }))

import { handlers, auth } from "./auth"

describe("auth", () => {
  it("exports handlers with GET and POST", () => {
    expect(handlers.GET).toBeDefined()
    expect(handlers.POST).toBeDefined()
  })

  it("exports auth function", () => {
    expect(typeof auth).toBe("function")
  })
})
