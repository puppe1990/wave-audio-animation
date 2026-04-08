const LOCAL_DATABASE_URL = "file:.data/wave-audio-animation.db"

export function resolveDatabaseUrl(input?: string): string {
  if (!input || input === "libsql://your-db.turso.io") {
    return LOCAL_DATABASE_URL
  }

  return input
}
