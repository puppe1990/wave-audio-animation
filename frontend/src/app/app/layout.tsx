import type { ReactNode } from "react"
import { auth } from "@/auth"
import { AppHeaderActions } from "@/components/editor/AppHeaderActions"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth()

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#0f172a,transparent_35%),linear-gradient(180deg,#020617_0%,#09090b_100%)] text-white">
      <header className="border-b border-white/10 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Wave</p>
            <h1 className="text-lg font-semibold tracking-tight">Editor de animação</h1>
          </div>
          {session?.user ? (
            <AppHeaderActions user={session.user} />
          ) : (
            <p className="text-sm text-zinc-400">Upload, estilo e exportação no browser</p>
          )}
        </div>
      </header>
      <main className="px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
