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
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-zinc-500">Sessao ativa</p>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-cyan-400 hover:text-cyan-300"
      >
        Sair
      </button>
    </div>
  )
}
