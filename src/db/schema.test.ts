import { describe, it, expect } from "vitest"
import { users, exports as exportsTable } from "./schema"

describe("schema", () => {
  it("users table has required columns", () => {
    expect(users).toBeDefined()
    expect(Object.keys(users)).toContain("id")
    expect(Object.keys(users)).toContain("email")
    expect(Object.keys(users)).toContain("name")
    expect(Object.keys(users)).toContain("passwordHash")
    expect(Object.keys(users)).toContain("createdAt")
  })

  it("exports table has required columns", () => {
    expect(exportsTable).toBeDefined()
    expect(Object.keys(exportsTable)).toContain("id")
    expect(Object.keys(exportsTable)).toContain("userId")
    expect(Object.keys(exportsTable)).toContain("format")
    expect(Object.keys(exportsTable)).toContain("style")
    expect(Object.keys(exportsTable)).toContain("aspectRatio")
    expect(Object.keys(exportsTable)).toContain("duration")
  })
})
