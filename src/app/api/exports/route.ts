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

  const body = (await req.json()) as ExportPayload

  await db.insert(exportsTable).values({
    id:          randomUUID(),
    userId:      session.user.id,
    format:      body.format,
    duration:    body.duration,
    style:       body.style,
    aspectRatio: body.aspectRatio,
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
