import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { Providers } from "./providers"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Wave — Animações de áudio para podcasts",
  description: "Gere vídeos com ondas de áudio animadas para publicar nas redes sociais.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={geist.className}>
      <body className="min-h-screen bg-zinc-950 text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
