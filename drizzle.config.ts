import type { Config } from "drizzle-kit"
import { resolveDatabaseUrl } from "./src/lib/db-config"

export default {
  schema:    "./src/db/schema.ts",
  out:       "./drizzle",
  dialect:   "turso",
  dbCredentials: {
    url:       resolveDatabaseUrl(process.env.TURSO_DATABASE_URL),
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} satisfies Config
