"use client"

import Link from "next/link"
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
            className="w-full py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition"
          >
            Entrar
          </button>
        </form>

        <p className="text-center text-sm text-gray-400">
          Ainda não tem conta?{" "}
          <Link href="/register" className="text-cyan-300 hover:text-cyan-200">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  )
}
