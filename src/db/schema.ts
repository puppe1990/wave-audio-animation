import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core"

export const users = sqliteTable("users", {
  id:           text("id").primaryKey(),
  email:        text("email").notNull().unique(),
  name:         text("name"),
  passwordHash: text("password_hash"),
  createdAt:    integer("created_at", { mode: "timestamp" })
                  .notNull()
                  .$defaultFn(() => new Date()),
})

export const exports = sqliteTable("exports", {
  id:          text("id").primaryKey(),
  userId:      text("user_id").notNull().references(() => users.id),
  format:      text("format", { enum: ["mp4", "gif"] }).notNull(),
  duration:    integer("duration").notNull(),       // seconds
  style:       text("style",       { enum: ["bars", "line", "mirror"] }).notNull(),
  aspectRatio: text("aspect_ratio", { enum: ["16:9", "9:16", "1:1"] }).notNull(),
  createdAt:   integer("created_at", { mode: "timestamp" })
                 .notNull()
                 .$defaultFn(() => new Date()),
})
