"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { useState } from "react"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })

      const payload = (await response.json()) as { error?: string }

      if (!response.ok) {
        setError(payload.error ?? "Não foi possível criar sua conta.")
        return
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (signInResult?.error) {
        router.push("/login")
        return
      }

      router.push("/app")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/80 p-8">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Wave</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Criar conta</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Gere seus primeiros vídeos com animação de áudio direto no navegador.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <input
            type="text"
            placeholder="Nome"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
          />

          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
          />

          <input
            type="password"
            placeholder="Senha"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
          />

          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-cyan-300 disabled:opacity-60"
          >
            {loading ? "Criando..." : "Criar conta"}
          </button>
        </form>

        <p className="mt-6 text-sm text-zinc-400">
          Já tem conta?{" "}
          <Link href="/login" className="text-cyan-300 hover:text-cyan-200">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  )
}
