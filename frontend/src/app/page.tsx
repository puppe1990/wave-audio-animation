"use client"

import Link from "next/link"
import { useState } from "react"
import { getToken } from "@/lib/api-client"

export default function LandingPage() {
  const [isAuthenticated] = useState(() => !!getToken())

  const destination = isAuthenticated ? "/app" : "/login"

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#164e63,transparent_25%),radial-gradient(circle_at_bottom_left,#0f172a,transparent_30%),linear-gradient(180deg,#020617_0%,#09090b_100%)]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Wave</p>
            <p className="mt-2 text-sm text-zinc-400">Videos com onda de audio para cortes e podcasts</p>
          </div>

          <Link
            href={destination}
            className="rounded-full border border-cyan-400/40 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:border-cyan-300 hover:text-white"
          >
            {isAuthenticated ? "Abrir editor" : "Entrar"}
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-14 py-16 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="mb-4 text-sm uppercase tracking-[0.35em] text-cyan-300">MicroSaaS para creators</p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
              Transforme seu podcast em um video pronto para Reels, TikTok e Shorts.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
              Suba o audio, escolha o estilo da onda, personalize as cores e exporte direto do navegador com nosso backend.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href={destination}
                className="rounded-2xl bg-cyan-400 px-6 py-4 text-base font-semibold text-zinc-950 transition hover:bg-cyan-300"
              >
                Comecar agora
              </Link>
              <a
                href="#como-funciona"
                className="rounded-2xl border border-white/10 px-6 py-4 text-base font-semibold text-white transition hover:border-cyan-400 hover:text-cyan-300"
              >
                Ver fluxo
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_30px_120px_rgba(34,211,238,0.12)] backdrop-blur">
            <div className="rounded-[1.5rem] border border-cyan-400/20 bg-zinc-950/80 p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Preview</p>
                  <h2 className="mt-2 text-lg font-semibold">Bars / 9:16 / MP4</h2>
                </div>
                <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-xs font-medium text-cyan-300">Ao vivo</span>
              </div>

              <div className="flex aspect-[9/16] items-end justify-center rounded-[1.5rem] bg-[linear-gradient(180deg,#082f49_0%,#020617_100%)] p-6">
                <div className="flex h-full w-full items-center justify-center gap-2">
                  {Array.from({ length: 24 }).map((_, index) => {
                    const heights = [28, 36, 48, 70, 82, 62, 44, 34]
                    const height = heights[index % heights.length]

                    return (
                      <span
                        key={index}
                        className="w-3 rounded-full bg-cyan-300/90"
                        style={{ height: `${height}%` }}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="grid gap-4 border-t border-white/10 pt-8 sm:grid-cols-3">
          {[
            ["1. Upload", "Validacao local de formato e tamanho antes de enviar ao servidor."],
            ["2. Personalizacao", "Barras, linha ou espelho com cores e proporcoes de social."],
            ["3. Exportacao", "Processamento server-side com polling de status e download direto."],
          ].map(([title, description]) => (
            <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-zinc-400">{description}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
