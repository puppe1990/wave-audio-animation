"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

interface Props {
  user: {
    name?: string | null
    email?: string | null
  }
}

export function AppHeaderActions({ user }: Props) {
  const { logout } = useAuth()
  const router = useRouter()
  const label = user.name || user.email || "Conta"

  function handleLogout() {
    logout()
    router.push("/login")
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2.5 text-right">
        <div>
          <p className="text-sm font-medium text-zinc-200">{label}</p>
          <div className="mt-0.5 flex items-center justify-end gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
            <span className="text-[11px] tracking-wide text-zinc-500">Sessao ativa</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-400 transition-all duration-200 hover:border-red-500/40 hover:bg-red-500/[0.06] hover:text-red-300"
      >
        Sair
      </button>
    </div>
  )
}
