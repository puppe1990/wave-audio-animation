import { mkdirSync } from "fs"
import { drizzle } from "drizzle-orm/libsql"
import { createClient } from "@libsql/client"
import { resolveDatabaseUrl } from "./db-config"

const url = resolveDatabaseUrl(process.env.TURSO_DATABASE_URL)

if (url.startsWith("file:")) {
  mkdirSync(".data", { recursive: true })
}

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

export const db = drizzle(client)
