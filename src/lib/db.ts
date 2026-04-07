import { drizzle } from "drizzle-orm/libsql"
import { createClient } from "@libsql/client"

const url = process.env.TURSO_DATABASE_URL
if (!url) throw new Error("Missing TURSO_DATABASE_URL environment variable")

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

export const db = drizzle(client)
