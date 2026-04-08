import { describe, expect, it } from "vitest"
import { resolveDatabaseUrl } from "./db-config"

describe("resolveDatabaseUrl", () => {
  it("falls back to a local database when env is missing", () => {
    expect(resolveDatabaseUrl()).toBe("file:.data/wave-audio-animation.db")
  })

  it("falls back to a local database when env uses the Turso placeholder", () => {
    expect(resolveDatabaseUrl("libsql://your-db.turso.io")).toBe("file:.data/wave-audio-animation.db")
  })

  it("preserves explicit database urls", () => {
    expect(resolveDatabaseUrl("file:custom.db")).toBe("file:custom.db")
  })
})
