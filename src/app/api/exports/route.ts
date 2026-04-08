import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { exports as exportsTable } from "@/db/schema"
import { randomUUID } from "crypto"
import type { ExportFormat, WaveStyle, AspectRatio } from "@/types"

interface ExportPayload {
  format:      ExportFormat
  duration:    number
  style:       WaveStyle
  aspectRatio: AspectRatio
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: ExportPayload
  try {
    body = (await req.json()) as ExportPayload
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  try {
    await db.insert(exportsTable).values({
      id:          randomUUID(),
      userId:      session.user.id,
      format:      body.format,
      duration:    body.duration,
      style:       body.style,
      aspectRatio: body.aspectRatio,
    })
  } catch {
    return NextResponse.json({ error: "Failed to record export" }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
