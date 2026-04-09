import type { ReactNode } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AppHeaderActions } from "@/components/editor/AppHeaderActions"

// Minimalist waveform SVG icon as inline component
function WaveIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="2" y="9" width="2.5" height="6" rx="1" fill="currentColor" opacity="0.5" />
      <rect x="6.5" y="5" width="2.5" height="14" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="11" y="7" width="2.5" height="10" rx="1" fill="currentColor" opacity="0.85" />
      <rect x="15.5" y="3" width="2.5" height="18" rx="1" fill="currentColor" />
      <rect x="20" y="8" width="2.5" height="8" rx="1" fill="currentColor" opacity="0.6" />
    </svg>
  )
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const token = (await cookies()).get("auth_token")?.value

  if (!token) {
    redirect("/login")
  }

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      {/* ---- Background layers ---- */}
      <div className="pointer-events-none absolute inset-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,211,238,0.08),transparent),radial-gradient(ellipse_60%_40%_at_50%_0%,#0f172a,transparent_50%),linear-gradient(180deg,#020617_0%,#09090b_100%)]" />
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        {/* Ambient glow */}
        <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-cyan-500/[0.04] blur-3xl" />
      </div>

      {/* ---- Header ---- */}
      <header className="relative border-b border-white/[0.06] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {/* Brand */}
            <div className="flex items-center gap-2.5 text-cyan-400">
              <WaveIcon />
              <span className="text-sm font-semibold uppercase tracking-[0.25em]">Wave</span>
            </div>
            {/* Separator dot */}
            <span className="h-1 w-1 rounded-full bg-zinc-700" />
            {/* Page title */}
            <h1 className="text-[15px] font-medium tracking-tight text-zinc-300">
              Editor de animacao
            </h1>
          </div>
          <AppHeaderActions user={{}} />
        </div>
      </header>

      {/* ---- Main content ---- */}
      <main className="relative px-4 py-10 sm:px-6 sm:py-12">{children}</main>
    </div>
  )
}
