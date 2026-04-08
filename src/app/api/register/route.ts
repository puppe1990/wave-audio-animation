import { randomUUID } from "crypto"
import bcrypt from "bcryptjs"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/db/schema"

interface RegisterPayload {
  name?: string
  email?: string
  password?: string
}

function isValidPayload(payload: RegisterPayload) {
  return Boolean(
    payload.email?.trim() &&
      payload.password &&
      payload.password.length >= 6
  )
}

export async function POST(request: NextRequest) {
  let body: RegisterPayload

  try {
    body = (await request.json()) as RegisterPayload
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: "Informe um email válido e senha com pelo menos 6 caracteres." },
      { status: 400 }
    )
  }

  const passwordHash = await bcrypt.hash(body.password!, 10)

  try {
    await db.insert(users).values({
      id: randomUUID(),
      name: body.name?.trim() || null,
      email: body.email!.trim().toLowerCase(),
      passwordHash,
    })
  } catch {
    return NextResponse.json(
      { error: "Não foi possível criar a conta. O email pode já estar em uso." },
      { status: 409 }
    )
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
