"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { login as apiLogin, ApiError } from "@/lib/api-client"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await apiLogin({ email, password })
      router.push("/app")
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Email ou senha invalidos.")
      } else {
        setError("Nao foi possivel fazer login. Tente novamente.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm p-8 rounded-2xl bg-gray-900 flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-white text-center">Entrar</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-indigo-500"
          />
          <input
            type="password"
            placeholder="Senha"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400">
          Ainda nao tem conta?{" "}
          <Link href="/register" className="text-cyan-300 hover:text-cyan-200">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  )
}
