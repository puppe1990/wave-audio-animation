# Wave Audio Animation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js MicroSaaS where users upload audio, choose a waveform style, and export an animated MP4 or GIF — all processed client-side in the browser.

**Architecture:** Next.js 16.2 App Router with TypeScript. All audio decoding, canvas rendering, and video encoding run in the browser via Web Audio API, Canvas 2D, and ffmpeg.wasm. The server only handles auth (NextAuth v5) and saving export records (Turso via Drizzle ORM).

**Tech Stack:** Next.js 16.2, TypeScript, NextAuth v5, Drizzle ORM, Turso (libSQL), Web Audio API, Canvas 2D, OffscreenCanvas, @ffmpeg/ffmpeg + @ffmpeg/util, bcryptjs, Vitest, @testing-library/react.

---

## File Map

| File | Responsibility |
|---|---|
| `src/types.ts` | Shared TypeScript types used across lib and components |
| `src/db/schema.ts` | Drizzle table definitions (users, exports) |
| `src/lib/db.ts` | Drizzle + Turso client singleton |
| `src/auth.ts` | NextAuth v5 configuration (Google + Credentials) |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth HTTP handler |
| `src/app/api/exports/route.ts` | POST — authenticated route to save export record |
| `src/middleware.ts` | Redirect unauthenticated users away from /app |
| `src/lib/audio.ts` | Decode audio file, extract per-frame amplitude array |
| `src/lib/renderer.ts` | Draw waveform frames onto Canvas 2D (bars/line/mirror) |
| `src/lib/exporter.ts` | Load ffmpeg.wasm, render all frames, encode MP4 or GIF |
| `src/components/editor/WaveformPreview.tsx` | Animated Canvas preview synced to audio playback |
| `src/components/editor/StepUpload.tsx` | Wizard step 1: drag & drop audio file |
| `src/components/editor/StepCustomize.tsx` | Wizard step 2: style, color, aspect ratio pickers |
| `src/components/editor/StepExport.tsx` | Wizard step 3: format selector, export button, download |
| `src/app/app/page.tsx` | Wizard orchestrator — holds shared state, renders active step |
| `src/app/login/page.tsx` | Sign-in page (Google + email/password) |
| `src/app/page.tsx` | Public landing page |

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json` (via create-next-app)
- Create: `vitest.config.ts`
- Create: `.env.local`

- [ ] **Step 1: Scaffold Next.js project**

```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack
```

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install next-auth@beta @auth/core drizzle-orm @libsql/client bcryptjs @ffmpeg/ffmpeg @ffmpeg/util
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D drizzle-kit vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @types/bcryptjs vitest-canvas-mock
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
  resolve: {
    alias: { "@": resolve(__dirname, "./src") },
  },
})
```

- [ ] **Step 5: Create `src/test/setup.ts`**

```ts
import "@testing-library/jest-dom"
import "vitest-canvas-mock"
```

- [ ] **Step 6: Create `.env.local`**

```env
NEXTAUTH_SECRET=changeme-generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-turso-token
```

- [ ] **Step 7: Add `ffmpeg` core files to `public/`**

```bash
mkdir -p public/ffmpeg
cp node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js public/ffmpeg/
cp node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm public/ffmpeg/
```

> Note: If `@ffmpeg/core` is not bundled with `@ffmpeg/ffmpeg`, install it separately: `npm install @ffmpeg/core`

- [ ] **Step 8: Configure `next.config.ts` for SharedArrayBuffer (required by ffmpeg.wasm)**

```ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ]
  },
}

export default nextConfig
```

- [ ] **Step 9: Verify dev server starts**

```bash
npm run dev
```

Expected: server running at http://localhost:3000 with no errors.

- [ ] **Step 10: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Next.js 16.2 project with vitest and ffmpeg config"
```

---

## Task 2: Shared types

**Files:**
- Create: `src/types.ts`
- Create: `src/types.test.ts`

- [ ] **Step 1: Write the test**

```ts
// src/types.test.ts
import { describe, it, expectTypeOf } from "vitest"
import type { WaveStyle, AspectRatio, ExportFormat, AudioData, EditorConfig } from "./types"

describe("types", () => {
  it("WaveStyle covers all three styles", () => {
    expectTypeOf<WaveStyle>().toEqualTypeOf<"bars" | "line" | "mirror">()
  })

  it("AspectRatio covers all three ratios", () => {
    expectTypeOf<AspectRatio>().toEqualTypeOf<"16:9" | "9:16" | "1:1">()
  })

  it("ExportFormat covers mp4 and gif", () => {
    expectTypeOf<ExportFormat>().toEqualTypeOf<"mp4" | "gif">()
  })

  it("AudioData has expected shape", () => {
    expectTypeOf<AudioData>().toMatchTypeOf<{
      amplitudes: Float32Array
      duration: number
      frameCount: number
    }>()
  })
})
```

- [ ] **Step 2: Run test — expect type errors (types don't exist yet)**

```bash
npx vitest run src/types.test.ts
```

Expected: FAIL — "Cannot find module './types'"

- [ ] **Step 3: Create `src/types.ts`**

```ts
export type WaveStyle = "bars" | "line" | "mirror"
export type AspectRatio = "16:9" | "9:16" | "1:1"
export type ExportFormat = "mp4" | "gif"

export interface AudioData {
  amplitudes: Float32Array
  duration: number       // total seconds
  sampleRate: number
  frameCount: number     // total frames at 30fps
}

export interface EditorConfig {
  style: WaveStyle
  primaryColor: string   // hex, e.g. "#6366f1"
  backgroundColor: string
  aspectRatio: AspectRatio
}

export interface RendererOptions extends EditorConfig {
  width: number
  height: number
}

export const ASPECT_RATIO_DIMENSIONS: Record<AspectRatio, [number, number]> = {
  "16:9": [1920, 1080],
  "9:16": [1080, 1920],
  "1:1":  [1080, 1080],
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/types.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/types.test.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: DB schema + client

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/lib/db.ts`
- Create: `drizzle.config.ts`
- Create: `src/db/schema.test.ts`

- [ ] **Step 1: Write the test**

```ts
// src/db/schema.test.ts
import { describe, it, expect } from "vitest"
import { users, exports as exportsTable } from "./schema"

describe("schema", () => {
  it("users table has required columns", () => {
    expect(users).toBeDefined()
    expect(Object.keys(users)).toContain("id")
    expect(Object.keys(users)).toContain("email")
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
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/db/schema.test.ts
```

Expected: FAIL — "Cannot find module './schema'"

- [ ] **Step 3: Create `src/db/schema.ts`**

```ts
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
```

- [ ] **Step 4: Create `src/lib/db.ts`**

```ts
import { drizzle } from "drizzle-orm/libsql"
import { createClient } from "@libsql/client"

const client = createClient({
  url:       process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

export const db = drizzle(client)
```

- [ ] **Step 5: Create `drizzle.config.ts`**

```ts
import type { Config } from "drizzle-kit"

export default {
  schema:    "./src/db/schema.ts",
  out:       "./drizzle",
  dialect:   "turso",
  dbCredentials: {
    url:       process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} satisfies Config
```

- [ ] **Step 6: Run test — expect PASS**

```bash
npx vitest run src/db/schema.test.ts
```

Expected: PASS

- [ ] **Step 7: Push schema to Turso**

```bash
npx drizzle-kit push
```

Expected: tables `users` and `exports` created in Turso.

- [ ] **Step 8: Commit**

```bash
git add src/db/schema.ts src/db/schema.test.ts src/lib/db.ts drizzle.config.ts
git commit -m "feat: add Drizzle schema and Turso client"
```

---

## Task 4: Auth (NextAuth v5)

**Files:**
- Create: `src/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/auth.test.ts`

- [ ] **Step 1: Write the test**

```ts
// src/auth.test.ts
import { describe, it, expect, vi } from "vitest"

// Must mock DB dependencies before importing auth
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(null),
        }),
      }),
    }),
  },
}))

vi.mock("@/db/schema", () => ({ users: {} }))

import { handlers, auth } from "./auth"

describe("auth", () => {
  it("exports handlers with GET and POST", () => {
    expect(handlers.GET).toBeDefined()
    expect(handlers.POST).toBeDefined()
  })

  it("exports auth function", () => {
    expect(typeof auth).toBe("function")
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/auth.test.ts
```

Expected: FAIL — "Cannot find module './auth'"

- [ ] **Step 3: Create `src/auth.ts`**

```ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null
        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .get()
        if (!user?.passwordHash) return null
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!valid) return null
        return { id: user.id, email: user.email, name: user.name ?? undefined }
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
})
```

- [ ] **Step 4: Create `src/app/api/auth/[...nextauth]/route.ts`**

```ts
import { handlers } from "@/auth"

export const { GET, POST } = handlers
```

- [ ] **Step 5: Create `src/app/login/page.tsx`**

```tsx
"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"

export default function LoginPage() {
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState("")

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })
    if (result?.error) {
      setError("Email ou senha inválidos.")
    } else {
      window.location.href = "/app"
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm p-8 rounded-2xl bg-gray-900 flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-white text-center">Entrar</h1>

        <button
          onClick={() => signIn("google", { callbackUrl: "/app" })}
          className="w-full py-2 rounded-lg bg-white text-gray-900 font-medium hover:bg-gray-100 transition"
        >
          Entrar com Google
        </button>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-gray-700" />
          <span className="text-gray-500 text-sm">ou</span>
          <div className="flex-1 h-px bg-gray-700" />
        </div>

        <form onSubmit={handleCredentials} className="flex flex-col gap-3">
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-indigo-500"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition"
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 6: Run test — expect PASS**

```bash
npx vitest run src/auth.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/auth.ts src/auth.test.ts src/app/api/auth src/app/login
git commit -m "feat: add NextAuth v5 with Google and Credentials providers"
```

---

## Task 5: Middleware (route protection)

**Files:**
- Create: `src/middleware.ts`
- Create: `src/middleware.test.ts`

- [ ] **Step 1: Write the test**

```ts
// src/middleware.test.ts
import { describe, it, expect, vi } from "vitest"

vi.mock("@/auth", () => ({
  auth: vi.fn((handler) => handler),
}))

describe("middleware config", () => {
  it("matches /app routes only", async () => {
    const { config } = await import("./middleware")
    expect(config.matcher).toContain("/app/:path*")
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/middleware.test.ts
```

Expected: FAIL — "Cannot find module './middleware'"

- [ ] **Step 3: Create `src/middleware.ts`**

```ts
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  if (!req.auth && req.nextUrl.pathname.startsWith("/app")) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }
})

export const config = {
  matcher: ["/app/:path*"],
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/middleware.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts src/middleware.test.ts
git commit -m "feat: protect /app routes via NextAuth middleware"
```

---

## Task 6: Audio processing

**Files:**
- Create: `src/lib/audio.ts`
- Create: `src/lib/audio.test.ts`

- [ ] **Step 1: Write the tests**

```ts
// src/lib/audio.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { extractAmplitudes, FRAMES_PER_SECOND } from "./audio"

// Minimal AudioBuffer mock
function makeAudioBuffer(samples: number[]): AudioBuffer {
  return {
    duration:        samples.length / 44100,
    sampleRate:      44100,
    numberOfChannels: 1,
    length:          samples.length,
    getChannelData:  () => new Float32Array(samples),
  } as unknown as AudioBuffer
}

describe("extractAmplitudes", () => {
  it("returns one amplitude value per frame", () => {
    // 1 second of audio at 44100 Hz → 30 frames at 30fps
    const samples  = new Array(44100).fill(0).map((_, i) => Math.sin(i * 0.1))
    const buffer   = makeAudioBuffer(samples)
    const result   = extractAmplitudes(buffer, FRAMES_PER_SECOND)
    expect(result.frameCount).toBe(30)
    expect(result.amplitudes.length).toBe(30)
  })

  it("normalizes amplitudes to 0–1", () => {
    const samples = [0.5, 1.0, 0.2, 0.8]
    const buffer  = makeAudioBuffer(samples)
    const result  = extractAmplitudes(buffer, FRAMES_PER_SECOND)
    const max     = Math.max(...result.amplitudes)
    expect(max).toBeCloseTo(1, 5)
    for (const v of result.amplitudes) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it("handles silent audio without dividing by zero", () => {
    const samples = new Array(44100).fill(0)
    const buffer  = makeAudioBuffer(samples)
    const result  = extractAmplitudes(buffer, FRAMES_PER_SECOND)
    for (const v of result.amplitudes) {
      expect(Number.isNaN(v)).toBe(false)
    }
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/lib/audio.test.ts
```

Expected: FAIL — "Cannot find module './audio'"

- [ ] **Step 3: Create `src/lib/audio.ts`**

```ts
import type { AudioData } from "@/types"

export const FRAMES_PER_SECOND = 30

/** Extracts RMS amplitude per frame from an AudioBuffer. */
export function extractAmplitudes(buffer: AudioBuffer, fps: number = FRAMES_PER_SECOND): AudioData {
  const channelData     = buffer.getChannelData(0)
  const sampleRate      = buffer.sampleRate
  const duration        = buffer.duration
  const frameCount      = Math.ceil(duration * fps)
  const samplesPerFrame = Math.floor(sampleRate / fps)
  const amplitudes      = new Float32Array(frameCount)

  for (let i = 0; i < frameCount; i++) {
    const start = i * samplesPerFrame
    const end   = Math.min(start + samplesPerFrame, channelData.length)
    let sumSq   = 0
    for (let j = start; j < end; j++) {
      sumSq += channelData[j] * channelData[j]
    }
    amplitudes[i] = Math.sqrt(sumSq / (end - start))
  }

  // normalize to 0–1
  const max = Math.max(...amplitudes)
  if (max > 0) {
    for (let i = 0; i < amplitudes.length; i++) {
      amplitudes[i] /= max
    }
  }

  return { amplitudes, duration, sampleRate, frameCount }
}

/** Decodes a File to AudioBuffer, then extracts amplitudes. */
export async function decodeAudio(file: File): Promise<AudioData> {
  const arrayBuffer  = await file.arrayBuffer()
  const audioContext = new AudioContext()
  const audioBuffer  = await audioContext.decodeAudioData(arrayBuffer)
  await audioContext.close()
  return extractAmplitudes(audioBuffer, FRAMES_PER_SECOND)
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/lib/audio.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/audio.ts src/lib/audio.test.ts
git commit -m "feat: add audio decoding and amplitude extraction"
```

---

## Task 7: Canvas renderer

**Files:**
- Create: `src/lib/renderer.ts`
- Create: `src/lib/renderer.test.ts`

- [ ] **Step 1: Write the tests**

```ts
// src/lib/renderer.test.ts
import { describe, it, expect, vi } from "vitest"
import { drawFrame, getDimensions } from "./renderer"
import type { RendererOptions } from "@/types"

const BASE_OPTIONS: RendererOptions = {
  style:           "bars",
  primaryColor:    "#6366f1",
  backgroundColor: "#000000",
  aspectRatio:     "16:9",
  width:           1920,
  height:          1080,
}

const AMPLITUDES = new Float32Array(60).fill(0).map((_, i) => (i % 10) / 10)

function makeCtx() {
  const canvas = document.createElement("canvas")
  canvas.width  = 1920
  canvas.height = 1080
  return canvas.getContext("2d")!
}

describe("getDimensions", () => {
  it("returns correct dimensions for 16:9", () => {
    expect(getDimensions("16:9")).toEqual([1920, 1080])
  })
  it("returns correct dimensions for 9:16", () => {
    expect(getDimensions("9:16")).toEqual([1080, 1920])
  })
  it("returns correct dimensions for 1:1", () => {
    expect(getDimensions("1:1")).toEqual([1080, 1080])
  })
})

describe("drawFrame", () => {
  it("calls fillRect for background on every draw", () => {
    const ctx = makeCtx()
    const fillRectSpy = vi.spyOn(ctx, "fillRect")
    drawFrame(ctx, AMPLITUDES, 0, BASE_OPTIONS)
    expect(fillRectSpy).toHaveBeenCalledWith(0, 0, 1920, 1080)
  })

  it("draws without throwing for all styles", () => {
    const ctx = makeCtx()
    for (const style of ["bars", "line", "mirror"] as const) {
      expect(() =>
        drawFrame(ctx, AMPLITUDES, 30, { ...BASE_OPTIONS, style })
      ).not.toThrow()
    }
  })

  it("clamps frameIndex to valid range", () => {
    const ctx = makeCtx()
    expect(() =>
      drawFrame(ctx, AMPLITUDES, 9999, BASE_OPTIONS)
    ).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/lib/renderer.test.ts
```

Expected: FAIL — "Cannot find module './renderer'"

- [ ] **Step 3: Create `src/lib/renderer.ts`**

```ts
import type { AspectRatio, RendererOptions } from "@/types"
import { ASPECT_RATIO_DIMENSIONS } from "@/types"

export function getDimensions(aspectRatio: AspectRatio): [number, number] {
  return ASPECT_RATIO_DIMENSIONS[aspectRatio]
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

export function drawFrame(
  ctx: Ctx,
  amplitudes: Float32Array,
  frameIndex: number,
  options: RendererOptions
): void {
  const { style, primaryColor, backgroundColor, width, height } = options

  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, width, height)

  const safeIndex = Math.min(frameIndex, amplitudes.length - 1)

  switch (style) {
    case "bars":   drawBars(ctx,   amplitudes, safeIndex, primaryColor, width, height); break
    case "line":   drawLine(ctx,   amplitudes, safeIndex, primaryColor, width, height); break
    case "mirror": drawMirror(ctx, amplitudes, safeIndex, primaryColor, width, height); break
  }
}

function drawBars(
  ctx: Ctx, amplitudes: Float32Array, frameIndex: number,
  color: string, width: number, height: number
): void {
  const barCount = 64
  const barW     = (width / barCount) * 0.6
  const gap      = (width / barCount) * 0.4
  const half     = Math.floor(barCount / 2)

  ctx.fillStyle = color
  for (let i = 0; i < barCount; i++) {
    const idx = Math.max(0, Math.min(amplitudes.length - 1, frameIndex - half + i))
    const amp = amplitudes[idx] ?? 0
    const barH = Math.max(4, amp * height * 0.85)
    const x    = i * (barW + gap) + gap / 2
    const y    = height - barH
    ctx.beginPath()
    ctx.roundRect(x, y, barW, barH, 4)
    ctx.fill()
  }
}

function drawLine(
  ctx: Ctx, amplitudes: Float32Array, frameIndex: number,
  color: string, width: number, height: number
): void {
  const points  = 120
  const half    = Math.floor(points / 2)
  const centerY = height / 2

  ctx.strokeStyle = color
  ctx.lineWidth   = Math.max(3, width / 400)
  ctx.lineCap     = "round"
  ctx.lineJoin    = "round"

  ctx.beginPath()
  for (let i = 0; i < points; i++) {
    const idx = Math.max(0, Math.min(amplitudes.length - 1, frameIndex - half + i))
    const x   = (i / (points - 1)) * width
    const y   = centerY - (amplitudes[idx] ?? 0) * height * 0.4
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()
}

function drawMirror(
  ctx: Ctx, amplitudes: Float32Array, frameIndex: number,
  color: string, width: number, height: number
): void {
  const barCount = 64
  const barW     = (width / barCount) * 0.6
  const gap      = (width / barCount) * 0.4
  const half     = Math.floor(barCount / 2)
  const centerY  = height / 2

  ctx.fillStyle = color
  for (let i = 0; i < barCount; i++) {
    const idx  = Math.max(0, Math.min(amplitudes.length - 1, frameIndex - half + i))
    const amp  = amplitudes[idx] ?? 0
    const barH = Math.max(2, amp * height * 0.42)
    const x    = i * (barW + gap) + gap / 2

    ctx.beginPath()
    ctx.roundRect(x, centerY - barH, barW, barH, 3)
    ctx.fill()

    ctx.beginPath()
    ctx.roundRect(x, centerY, barW, barH, 3)
    ctx.fill()
  }
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/lib/renderer.test.ts
```

Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/renderer.ts src/lib/renderer.test.ts
git commit -m "feat: add Canvas 2D renderer for bars, line, and mirror waveform styles"
```

---

## Task 8: ffmpeg.wasm exporter

**Files:**
- Create: `src/lib/exporter.ts`
- Create: `src/lib/exporter.test.ts`

- [ ] **Step 1: Write the tests**

```ts
// src/lib/exporter.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock @ffmpeg/ffmpeg and @ffmpeg/util before importing exporter
vi.mock("@ffmpeg/ffmpeg", () => ({
  FFmpeg: vi.fn().mockImplementation(() => ({
    load:      vi.fn().mockResolvedValue(undefined),
    exec:      vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile:  vi.fn().mockResolvedValue(new Uint8Array([0, 1, 2])),
  })),
}))

vi.mock("@ffmpeg/util", () => ({
  toBlobURL: vi.fn().mockResolvedValue("blob:mock"),
}))

import { exportVideo } from "./exporter"
import type { AudioData, EditorConfig } from "@/types"

const AUDIO: AudioData = {
  amplitudes: new Float32Array([0.1, 0.5, 0.9, 0.3]),
  duration:   4 / 30,
  sampleRate: 44100,
  frameCount: 4,
}

const CONFIG: EditorConfig = {
  style:           "bars",
  primaryColor:    "#6366f1",
  backgroundColor: "#000000",
  aspectRatio:     "16:9",
}

describe("exportVideo", () => {
  it("returns a Blob for mp4 format", async () => {
    const result = await exportVideo(AUDIO, CONFIG, "mp4")
    expect(result).toBeInstanceOf(Blob)
    expect(result.type).toBe("video/mp4")
  })

  it("returns a Blob for gif format", async () => {
    const result = await exportVideo(AUDIO, CONFIG, "gif")
    expect(result).toBeInstanceOf(Blob)
    expect(result.type).toBe("image/gif")
  })

  it("calls onProgress with values between 0 and 1", async () => {
    const calls: number[] = []
    await exportVideo(AUDIO, CONFIG, "mp4", (p) => calls.push(p))
    expect(calls.length).toBeGreaterThan(0)
    expect(calls[calls.length - 1]).toBe(1)
    for (const v of calls) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/lib/exporter.test.ts
```

Expected: FAIL — "Cannot find module './exporter'"

- [ ] **Step 3: Create `src/lib/exporter.ts`**

```ts
import type { AudioData, EditorConfig, ExportFormat } from "@/types"
import { drawFrame, getDimensions } from "./renderer"

export type ProgressCallback = (progress: number) => void

export async function exportVideo(
  audioData:  AudioData,
  config:     EditorConfig,
  format:     ExportFormat,
  onProgress?: ProgressCallback
): Promise<Blob> {
  const { FFmpeg }               = await import("@ffmpeg/ffmpeg")
  const { toBlobURL }            = await import("@ffmpeg/util")
  const [width, height]          = getDimensions(config.aspectRatio)
  const fps                      = 30
  const ffmpeg                   = new FFmpeg()

  await ffmpeg.load({
    coreURL: await toBlobURL("/ffmpeg/ffmpeg-core.js",   "text/javascript"),
    wasmURL: await toBlobURL("/ffmpeg/ffmpeg-core.wasm", "application/wasm"),
  })

  const canvas = new OffscreenCanvas(width, height)
  const ctx    = canvas.getContext("2d")!
  const opts   = { ...config, width, height }

  for (let i = 0; i < audioData.frameCount; i++) {
    drawFrame(ctx, audioData.amplitudes, i, opts)
    const blob        = await canvas.convertToBlob({ type: "image/png" })
    const arrayBuffer = await blob.arrayBuffer()
    await ffmpeg.writeFile(`frame${String(i).padStart(6, "0")}.png`, new Uint8Array(arrayBuffer))
    onProgress?.((i / audioData.frameCount) * 0.8)
  }

  if (format === "mp4") {
    await ffmpeg.exec([
      "-framerate", String(fps),
      "-i",         "frame%06d.png",
      "-c:v",       "libx264",
      "-pix_fmt",   "yuv420p",
      "-crf",       "23",
      "output.mp4",
    ])
    const data = await ffmpeg.readFile("output.mp4") as Uint8Array
    onProgress?.(1)
    return new Blob([data], { type: "video/mp4" })
  } else {
    await ffmpeg.exec(["-framerate", String(fps), "-i", "frame%06d.png", "-vf", "palettegen", "palette.png"])
    await ffmpeg.exec([
      "-framerate", String(fps),
      "-i",         "frame%06d.png",
      "-i",         "palette.png",
      "-lavfi",     "paletteuse",
      "-r",         "15",
      "output.gif",
    ])
    const data = await ffmpeg.readFile("output.gif") as Uint8Array
    onProgress?.(1)
    return new Blob([data], { type: "image/gif" })
  }
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/lib/exporter.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/exporter.ts src/lib/exporter.test.ts
git commit -m "feat: add ffmpeg.wasm exporter for MP4 and GIF"
```

---

## Task 9: API route — POST /api/exports

**Files:**
- Create: `src/app/api/exports/route.ts`
- Create: `src/app/api/exports/route.test.ts`

- [ ] **Step 1: Write the test**

```ts
// src/app/api/exports/route.test.ts
import { describe, it, expect, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
}))

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  },
}))

vi.mock("@/db/schema", () => ({
  exports: {},
}))

import { POST } from "./route"

describe("POST /api/exports", () => {
  it("returns 201 on valid payload", async () => {
    const req = new NextRequest("http://localhost/api/exports", {
      method: "POST",
      body: JSON.stringify({
        format:      "mp4",
        duration:    30,
        style:       "bars",
        aspectRatio: "16:9",
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it("returns 401 when not authenticated", async () => {
    const { auth } = await import("@/auth")
    vi.mocked(auth).mockResolvedValueOnce(null)

    const req = new NextRequest("http://localhost/api/exports", {
      method: "POST",
      body: JSON.stringify({ format: "mp4", duration: 30, style: "bars", aspectRatio: "16:9" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/app/api/exports/route.test.ts
```

Expected: FAIL — "Cannot find module './route'"

- [ ] **Step 3: Create `src/app/api/exports/route.ts`**

```ts
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
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/app/api/exports/route.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/exports/
git commit -m "feat: add POST /api/exports route to log export records"
```

---

## Task 10: WaveformPreview component

**Files:**
- Create: `src/components/editor/WaveformPreview.tsx`
- Create: `src/components/editor/WaveformPreview.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// src/components/editor/WaveformPreview.test.tsx
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { WaveformPreview } from "./WaveformPreview"
import type { AudioData, EditorConfig } from "@/types"

const AUDIO: AudioData = {
  amplitudes: new Float32Array(30).fill(0.5),
  duration:   1,
  sampleRate: 44100,
  frameCount: 30,
}

const CONFIG: EditorConfig = {
  style:           "bars",
  primaryColor:    "#6366f1",
  backgroundColor: "#000000",
  aspectRatio:     "16:9",
}

describe("WaveformPreview", () => {
  it("renders a canvas element", () => {
    render(<WaveformPreview audioData={AUDIO} config={CONFIG} />)
    expect(document.querySelector("canvas")).toBeTruthy()
  })

  it("renders play/pause button", () => {
    render(<WaveformPreview audioData={AUDIO} config={CONFIG} />)
    expect(screen.getByRole("button")).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/components/editor/WaveformPreview.test.tsx
```

Expected: FAIL — "Cannot find module './WaveformPreview'"

- [ ] **Step 3: Create `src/components/editor/WaveformPreview.tsx`**

```tsx
"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { drawFrame } from "@/lib/renderer"
import { getDimensions } from "@/lib/renderer"
import type { AudioData, EditorConfig } from "@/types"

interface Props {
  audioData: AudioData
  config:    EditorConfig
}

export function WaveformPreview({ audioData, config }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const rafRef     = useRef<number>(0)
  const frameRef   = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [width, height] = getDimensions(config.aspectRatio)

  const render = useCallback((frame: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    drawFrame(ctx, audioData.amplitudes, frame, { ...config, width, height })
  }, [audioData, config, width, height])

  // render current frame whenever config/data changes
  useEffect(() => {
    render(frameRef.current)
  }, [render])

  // animation loop
  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(rafRef.current)
      return
    }

    const fps = 30
    let last  = performance.now()

    function loop(now: number) {
      const elapsed = now - last
      if (elapsed >= 1000 / fps) {
        last = now
        frameRef.current = (frameRef.current + 1) % audioData.frameCount
        render(frameRef.current)
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, audioData.frameCount, render])

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full rounded-xl border border-gray-700"
        style={{ aspectRatio: `${width}/${height}`, maxHeight: "50vh", objectFit: "contain" }}
      />
      <button
        onClick={() => setPlaying((p) => !p)}
        className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition"
      >
        {playing ? "Pausar" : "▶ Preview"}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/components/editor/WaveformPreview.test.tsx
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/WaveformPreview.tsx src/components/editor/WaveformPreview.test.tsx
git commit -m "feat: add WaveformPreview canvas component with play/pause"
```

---

## Task 11: StepUpload component

**Files:**
- Create: `src/components/editor/StepUpload.tsx`
- Create: `src/components/editor/StepUpload.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// src/components/editor/StepUpload.test.tsx
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { StepUpload } from "./StepUpload"

describe("StepUpload", () => {
  it("renders upload area", () => {
    render(<StepUpload onAudioReady={vi.fn()} />)
    expect(screen.getByText(/arraste/i)).toBeTruthy()
  })

  it("shows error for unsupported format", async () => {
    render(<StepUpload onAudioReady={vi.fn()} />)
    const input = document.querySelector("input[type=file]") as HTMLInputElement
    const file  = new File(["data"], "track.xyz", { type: "application/octet-stream" })
    Object.defineProperty(input, "files", { value: [file] })
    fireEvent.change(input)
    const error = await screen.findByText(/formato/i)
    expect(error).toBeTruthy()
  })

  it("shows error for file over 50MB", async () => {
    render(<StepUpload onAudioReady={vi.fn()} />)
    const input = document.querySelector("input[type=file]") as HTMLInputElement
    const big   = new File([new ArrayBuffer(51 * 1024 * 1024)], "big.mp3", { type: "audio/mpeg" })
    Object.defineProperty(input, "files", { value: [big] })
    fireEvent.change(input)
    const error = await screen.findByText(/50MB/i)
    expect(error).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/components/editor/StepUpload.test.tsx
```

Expected: FAIL — "Cannot find module './StepUpload'"

- [ ] **Step 3: Create `src/components/editor/StepUpload.tsx`**

```tsx
"use client"

import { useState, useRef, DragEvent, ChangeEvent } from "react"
import { decodeAudio } from "@/lib/audio"
import type { AudioData } from "@/types"

const ACCEPTED_TYPES = ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/ogg", "audio/aac"]
const MAX_BYTES      = 50 * 1024 * 1024 // 50 MB

interface Props {
  onAudioReady: (data: AudioData) => void
}

export function StepUpload({ onAudioReady }: Props) {
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function process(file: File) {
    setError("")
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Formato inválido. Use MP3, WAV, M4A ou OGG.")
      return
    }
    if (file.size > MAX_BYTES) {
      setError("Arquivo muito grande. O limite é 50MB.")
      return
    }
    setLoading(true)
    try {
      const data = await decodeAudio(file)
      onAudioReady(data)
    } catch {
      setError("Não foi possível decodificar o áudio. Tente outro arquivo.")
    } finally {
      setLoading(false)
    }
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) process(file)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) process(file)
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto">
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        className={`w-full border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-3 cursor-pointer transition
          ${dragging ? "border-indigo-400 bg-indigo-950" : "border-gray-700 bg-gray-900 hover:border-indigo-500"}`}
      >
        <span className="text-4xl">🎙</span>
        <p className="text-white font-medium">Arraste o áudio aqui</p>
        <p className="text-gray-400 text-sm">ou clique para selecionar</p>
        <p className="text-gray-600 text-xs">MP3, WAV, M4A, OGG — máx. 50MB</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/ogg,audio/aac"
        onChange={onFileChange}
        className="hidden"
      />

      {loading && <p className="text-indigo-400 text-sm">Processando áudio...</p>}
      {error   && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/components/editor/StepUpload.test.tsx
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/StepUpload.tsx src/components/editor/StepUpload.test.tsx
git commit -m "feat: add StepUpload component with drag & drop and validation"
```

---

## Task 12: StepCustomize component

**Files:**
- Create: `src/components/editor/StepCustomize.tsx`
- Create: `src/components/editor/StepCustomize.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// src/components/editor/StepCustomize.test.tsx
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { StepCustomize } from "./StepCustomize"
import type { AudioData, EditorConfig } from "@/types"

const AUDIO: AudioData = {
  amplitudes: new Float32Array(30).fill(0.5),
  duration:   1,
  sampleRate: 44100,
  frameCount: 30,
}

const DEFAULT_CONFIG: EditorConfig = {
  style:           "bars",
  primaryColor:    "#6366f1",
  backgroundColor: "#000000",
  aspectRatio:     "16:9",
}

describe("StepCustomize", () => {
  it("renders all three style buttons", () => {
    render(
      <StepCustomize
        audioData={AUDIO}
        config={DEFAULT_CONFIG}
        onChange={vi.fn()}
        onNext={vi.fn()}
      />
    )
    expect(screen.getByText(/barras/i)).toBeTruthy()
    expect(screen.getByText(/linha/i)).toBeTruthy()
    expect(screen.getByText(/espelho/i)).toBeTruthy()
  })

  it("calls onChange when style changes", () => {
    const onChange = vi.fn()
    render(
      <StepCustomize
        audioData={AUDIO}
        config={DEFAULT_CONFIG}
        onChange={onChange}
        onNext={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText(/linha/i))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ style: "line" }))
  })

  it("renders aspect ratio selector", () => {
    render(
      <StepCustomize
        audioData={AUDIO}
        config={DEFAULT_CONFIG}
        onChange={vi.fn()}
        onNext={vi.fn()}
      />
    )
    expect(screen.getByText("16:9")).toBeTruthy()
    expect(screen.getByText("9:16")).toBeTruthy()
    expect(screen.getByText("1:1")).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/components/editor/StepCustomize.test.tsx
```

Expected: FAIL — "Cannot find module './StepCustomize'"

- [ ] **Step 3: Create `src/components/editor/StepCustomize.tsx`**

```tsx
"use client"

import type { AudioData, EditorConfig, WaveStyle, AspectRatio } from "@/types"
import { WaveformPreview } from "./WaveformPreview"

const STYLES: { key: WaveStyle; label: string }[] = [
  { key: "bars",   label: "Barras"  },
  { key: "line",   label: "Linha"   },
  { key: "mirror", label: "Espelho" },
]

const RATIOS: AspectRatio[] = ["16:9", "9:16", "1:1"]

interface Props {
  audioData: AudioData
  config:    EditorConfig
  onChange:  (config: EditorConfig) => void
  onNext:    () => void
}

export function StepCustomize({ audioData, config, onChange, onNext }: Props) {
  function set<K extends keyof EditorConfig>(key: K, value: EditorConfig[K]) {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      <WaveformPreview audioData={audioData} config={config} />

      {/* Style */}
      <div>
        <p className="text-gray-400 text-sm mb-2 uppercase tracking-wide">Estilo da onda</p>
        <div className="flex gap-3">
          {STYLES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => set("style", key)}
              className={`px-4 py-2 rounded-lg font-medium transition text-sm
                ${config.style === key
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Aspect ratio */}
      <div>
        <p className="text-gray-400 text-sm mb-2 uppercase tracking-wide">Proporção</p>
        <div className="flex gap-3">
          {RATIOS.map((r) => (
            <button
              key={r}
              onClick={() => set("aspectRatio", r)}
              className={`px-4 py-2 rounded-lg font-medium transition text-sm
                ${config.aspectRatio === r
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="flex gap-6">
        <div>
          <p className="text-gray-400 text-sm mb-2 uppercase tracking-wide">Cor da onda</p>
          <input
            type="color"
            value={config.primaryColor}
            onChange={(e) => set("primaryColor", e.target.value)}
            className="w-12 h-10 rounded cursor-pointer border-0 bg-transparent"
          />
        </div>
        <div>
          <p className="text-gray-400 text-sm mb-2 uppercase tracking-wide">Fundo</p>
          <input
            type="color"
            value={config.backgroundColor}
            onChange={(e) => set("backgroundColor", e.target.value)}
            className="w-12 h-10 rounded cursor-pointer border-0 bg-transparent"
          />
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition"
      >
        Continuar para exportação →
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/components/editor/StepCustomize.test.tsx
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/StepCustomize.tsx src/components/editor/StepCustomize.test.tsx
git commit -m "feat: add StepCustomize component with style, color, and ratio pickers"
```

---

## Task 13: StepExport component

**Files:**
- Create: `src/components/editor/StepExport.tsx`
- Create: `src/components/editor/StepExport.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
// src/components/editor/StepExport.test.tsx
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { StepExport } from "./StepExport"
import type { AudioData, EditorConfig } from "@/types"

const AUDIO: AudioData = {
  amplitudes: new Float32Array(30).fill(0.5),
  duration:   1,
  sampleRate: 44100,
  frameCount: 30,
}

const CONFIG: EditorConfig = {
  style:           "bars",
  primaryColor:    "#6366f1",
  backgroundColor: "#000000",
  aspectRatio:     "16:9",
}

vi.mock("@/lib/exporter", () => ({
  exportVideo: vi.fn().mockResolvedValue(new Blob(["fake"], { type: "video/mp4" })),
}))

vi.mock("@/lib/audio", () => ({}))

describe("StepExport", () => {
  it("renders MP4 and GIF format buttons", () => {
    render(<StepExport audioData={AUDIO} config={CONFIG} />)
    expect(screen.getByText("MP4")).toBeTruthy()
    expect(screen.getByText("GIF")).toBeTruthy()
  })

  it("renders export button", () => {
    render(<StepExport audioData={AUDIO} config={CONFIG} />)
    expect(screen.getByRole("button", { name: /exportar/i })).toBeTruthy()
  })

  it("shows progress bar after clicking export", async () => {
    render(<StepExport audioData={AUDIO} config={CONFIG} />)
    fireEvent.click(screen.getByRole("button", { name: /exportar/i }))
    const progress = await screen.findByRole("progressbar")
    expect(progress).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/components/editor/StepExport.test.tsx
```

Expected: FAIL — "Cannot find module './StepExport'"

- [ ] **Step 3: Create `src/components/editor/StepExport.tsx`**

```tsx
"use client"

import { useState } from "react"
import { exportVideo } from "@/lib/exporter"
import type { AudioData, EditorConfig, ExportFormat } from "@/types"

interface Props {
  audioData: AudioData
  config:    EditorConfig
}

export function StepExport({ audioData, config }: Props) {
  const [format,   setFormat]   = useState<ExportFormat>("mp4")
  const [progress, setProgress] = useState<number | null>(null)
  const [error,    setError]    = useState("")
  const [blobUrl,  setBlobUrl]  = useState("")

  async function handleExport() {
    setError("")
    setBlobUrl("")
    setProgress(0)

    try {
      const blob = await exportVideo(audioData, config, format, setProgress)
      const url  = URL.createObjectURL(blob)
      setBlobUrl(url)

      // Log to server (fire-and-forget)
      fetch("/api/exports", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          format,
          duration:    Math.round(audioData.duration),
          style:       config.style,
          aspectRatio: config.aspectRatio,
        }),
      }).catch(() => {/* ignore */})
    } catch (e) {
      setError("Falha ao exportar. Tente novamente.")
      console.error(e)
    } finally {
      setProgress(null)
    }
  }

  function handleDownload() {
    if (!blobUrl) return
    const a    = document.createElement("a")
    a.href     = blobUrl
    a.download = `waveform.${format}`
    a.click()
    URL.revokeObjectURL(blobUrl)
    setBlobUrl("")
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
      {/* Format selector */}
      <div>
        <p className="text-gray-400 text-sm mb-2 uppercase tracking-wide">Formato</p>
        <div className="flex gap-3">
          {(["mp4", "gif"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`px-6 py-2 rounded-lg font-medium uppercase transition
                ${format === f
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Progress */}
      {progress !== null && (
        <div>
          <p className="text-indigo-400 text-sm mb-1">
            Gerando vídeo... {Math.round(progress * 100)}%
          </p>
          <div
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full h-2 bg-gray-800 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-indigo-500 transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {/* Actions */}
      {blobUrl ? (
        <button
          onClick={handleDownload}
          className="w-full py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-500 transition"
        >
          ⬇ Baixar {format.toUpperCase()}
        </button>
      ) : (
        <button
          onClick={handleExport}
          disabled={progress !== null}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 disabled:opacity-50 transition"
        >
          {progress !== null ? "Exportando..." : "Exportar"}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/components/editor/StepExport.test.tsx
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/StepExport.tsx src/components/editor/StepExport.test.tsx
git commit -m "feat: add StepExport component with format selector, progress, and download"
```

---

## Task 14: Editor page (wizard orchestrator)

**Files:**
- Create: `src/app/app/page.tsx`
- Create: `src/app/app/layout.tsx`

- [ ] **Step 1: Create `src/app/app/layout.tsx`**

```tsx
import type { ReactNode } from "react"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center">
        <span className="font-bold text-lg tracking-tight">Wave ▶</span>
      </header>
      <main className="px-4 py-8">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/app/app/page.tsx`**

```tsx
"use client"

import { useState } from "react"
import { StepUpload }    from "@/components/editor/StepUpload"
import { StepCustomize } from "@/components/editor/StepCustomize"
import { StepExport }    from "@/components/editor/StepExport"
import type { AudioData, EditorConfig } from "@/types"

const STEPS = ["Upload", "Personalizar", "Exportar"] as const

const DEFAULT_CONFIG: EditorConfig = {
  style:           "bars",
  primaryColor:    "#6366f1",
  backgroundColor: "#000000",
  aspectRatio:     "16:9",
}

export default function EditorPage() {
  const [step,      setStep]      = useState(0)
  const [audioData, setAudioData] = useState<AudioData | null>(null)
  const [config,    setConfig]    = useState<EditorConfig>(DEFAULT_CONFIG)

  function handleAudioReady(data: AudioData) {
    setAudioData(data)
    setStep(1)
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition
              ${i < step  ? "bg-indigo-700 text-white"
              : i === step ? "bg-indigo-500 text-white"
              :              "bg-gray-800 text-gray-500"}`}
            >
              {i + 1}
            </div>
            <span className={`text-sm ${i === step ? "text-white" : "text-gray-500"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-700" />}
          </div>
        ))}
      </div>

      {/* Active step */}
      {step === 0 && (
        <StepUpload onAudioReady={handleAudioReady} />
      )}
      {step === 1 && audioData && (
        <StepCustomize
          audioData={audioData}
          config={config}
          onChange={setConfig}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && audioData && (
        <StepExport audioData={audioData} config={config} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run all tests to make sure nothing broke**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/app/
git commit -m "feat: add editor wizard page with step orchestration"
```

---

## Task 15: Landing page

**Files:**
- Create: `src/app/page.tsx`
- Modify: `src/app/layout.tsx` (add SessionProvider)

- [ ] **Step 1: Update `src/app/layout.tsx` to wrap app in SessionProvider**

```tsx
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "next-auth/react"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title:       "Wave — Animações de áudio para podcasts",
  description: "Gere vídeos com ondas de áudio animadas para publicar nas redes sociais.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${geist.className} antialiased bg-gray-950 text-white`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Create `src/app/page.tsx`**

```tsx
import Link from "next/link"
import { auth } from "@/auth"

export default async function LandingPage() {
  const session = await auth()

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b border-gray-800">
        <span className="font-bold text-lg tracking-tight">Wave ▶</span>
        <Link
          href={session ? "/app" : "/login"}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition"
        >
          {session ? "Abrir editor" : "Entrar"}
        </Link>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 gap-6">
        <h1 className="text-5xl font-extrabold tracking-tight max-w-2xl">
          Transforme seu podcast em conteúdo visual
        </h1>
        <p className="text-gray-400 text-lg max-w-xl">
          Suba o áudio, escolha o estilo da onda e exporte um vídeo pronto para o Reels,
          TikTok ou YouTube — tudo em português, no seu browser.
        </p>
        <Link
          href={session ? "/app" : "/login"}
          className="px-8 py-4 rounded-2xl bg-indigo-600 text-white text-lg font-semibold hover:bg-indigo-500 transition"
        >
          Começar agora — é grátis
        </Link>
      </section>

      <footer className="px-6 py-4 text-center text-gray-600 text-sm border-t border-gray-800">
        Wave © {new Date().getFullYear()}
      </footer>
    </main>
  )
}
```

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 4: Start dev server and verify full flow manually**

```bash
npm run dev
```

Visit http://localhost:3000 and verify:
- Landing page renders
- "Entrar" redirects to /login
- Google OAuth and email/password flows work (requires valid .env.local credentials)
- /app renders the wizard
- Upload step accepts MP3/WAV, rejects invalid files and files > 50MB
- Customize step shows preview and controls
- Export step encodes and downloads MP4/GIF

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/layout.tsx
git commit -m "feat: add landing page and complete MVP"
```

---

## Final check

```bash
npx vitest run
```

Expected output: all test suites pass. Summary should show tests for:
- `src/types.test.ts`
- `src/db/schema.test.ts`
- `src/auth.test.ts`
- `src/middleware.test.ts`
- `src/lib/audio.test.ts`
- `src/lib/renderer.test.ts`
- `src/lib/exporter.test.ts`
- `src/components/editor/WaveformPreview.test.tsx`
- `src/components/editor/StepUpload.test.tsx`
- `src/components/editor/StepCustomize.test.tsx`
- `src/components/editor/StepExport.test.tsx`
