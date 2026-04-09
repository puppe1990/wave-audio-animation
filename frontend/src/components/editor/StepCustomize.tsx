"use client"

import { useEffect, useRef, useState } from "react"
import type { AspectRatio, EditorConfig, WaveStyle } from "@/types"

const STYLES: Array<{ key: WaveStyle; label: string }> = [
  { key: "bars", label: "Barras" },
  { key: "line", label: "Linha" },
  { key: "mirror", label: "Espelho" },
]

const RATIOS: AspectRatio[] = ["16:9", "9:16", "1:1"]

const COLOR_PRESETS = [
  "#22d3ee", // cyan
  "#60a5fa", // blue
  "#a78bfa", // violet
  "#f472b6", // pink
  "#34d399", // emerald
  "#fbbf24", // amber
  "#f87171", // red
  "#e2e8f0", // slate
]

const BG_PRESETS = [
  "#020617", // deep slate
  "#0a0a0a", // pure black
  "#0f172a", // navy
  "#1a0a2e", // deep purple
  "#0a1a0f", // deep green
  "#1a0505", // deep red
]

interface Props {
  audioFile?: File
  config: EditorConfig
  onChange: (config: EditorConfig) => void
  onNext: () => void
}

function BarsPreview({ primaryColor, bgColor }: { primaryColor: string; bgColor: string }) {
  const bars = [30, 55, 40, 70, 45, 85, 50, 65, 75, 40, 60, 50]
  return (
    <div className="flex items-end justify-center gap-[3px]" style={{ height: 64 }}>
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full transition-colors duration-300"
          style={{
            height: `${h}%`,
            backgroundColor: primaryColor,
            opacity: 0.4 + (i / bars.length) * 0.6,
          }}
        />
      ))}
    </div>
  )
}

function LinePreview({ primaryColor, bgColor }: { primaryColor: string; bgColor: string }) {
  return (
    <svg width="120" height="64" viewBox="0 0 120 64" fill="none" aria-hidden="true">
      <path
        d="M0 32 Q10 20, 20 28 T40 24 T60 32 T80 20 T100 28 T120 32"
        stroke={primaryColor}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MirrorPreview({ primaryColor, bgColor }: { primaryColor: string; bgColor: string }) {
  const bars = [20, 40, 30, 50, 35, 60, 45]
  return (
    <div className="flex flex-col items-center justify-center gap-0" style={{ height: 64 }}>
      <div className="flex items-end gap-[3px]">
        {bars.map((h, i) => (
          <div
            key={`top-${i}`}
            className="w-[3px] rounded-t-full transition-colors duration-300"
            style={{
              height: `${h}%`,
              backgroundColor: primaryColor,
              opacity: 0.4 + (i / bars.length) * 0.6,
            }}
          />
        ))}
      </div>
      <div
        className="h-px w-full opacity-30"
        style={{ backgroundColor: primaryColor }}
      />
      <div className="flex items-start gap-[3px]">
        {bars.map((h, i) => (
          <div
            key={`bot-${i}`}
            className="w-[3px] rounded-b-full transition-colors duration-300"
            style={{
              height: `${h}%`,
              backgroundColor: primaryColor,
              opacity: 0.4 + (i / bars.length) * 0.6,
              transform: "scaleY(-1)",
            }}
          />
        ))}
      </div>
    </div>
  )
}

const STYLE_PREVIEWS: Record<WaveStyle, React.FC<{ primaryColor: string; bgColor: string }>> = {
  bars: BarsPreview,
  line: LinePreview,
  mirror: MirrorPreview,
}

export function StepCustomize({ audioFile, config, onChange, onNext }: Props) {
  function setConfigValue<Key extends keyof EditorConfig>(key: Key, value: EditorConfig[Key]) {
    onChange({ ...config, [key]: value })
  }

  const StylePreview = STYLE_PREVIEWS[config.style]

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 animate-fade-in-up">
      {/* File info card */}
      {audioFile && (
        <section className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-5 transition-all duration-200 hover:border-zinc-700/60 hover:bg-zinc-900/50">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
            Arquivo selecionado
          </p>
          <p className="text-[15px] font-medium tracking-tight text-zinc-100">{audioFile.name}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {(audioFile.size / (1024 * 1024)).toFixed(1)} MB — Processamento de audio no servidor
          </p>
        </section>
      )}

      {/* Main customization grid */}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Left: Style & Ratio */}
        <div className="flex flex-col gap-6">
          {/* Wave style selector */}
          <section>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
              Estilo da onda
            </p>
            <div className="flex gap-2.5">
              {STYLES.map(({ key, label }) => {
                const isActive = config.style === key
                const PreviewComponent = STYLE_PREVIEWS[key]
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setConfigValue("style", key)}
                    className={`flex flex-1 flex-col items-center gap-2.5 rounded-2xl border p-4 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "border-cyan-400/40 bg-cyan-950/20 text-white ring-2 ring-cyan-400/20 ring-offset-2 ring-offset-[#020617]"
                        : "border-zinc-800/80 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/50 hover:text-zinc-300"
                    }`}
                  >
                    <div
                      className={`transition-opacity duration-200 ${
                        isActive ? "opacity-100" : "opacity-40"
                      }`}
                    >
                      <PreviewComponent
                        primaryColor={isActive ? config.primaryColor : "#52525b"}
                        bgColor={config.backgroundColor}
                      />
                    </div>
                    <span className="text-xs tracking-wide">{label}</span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Aspect ratio selector */}
          <section>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
              Proporcao
            </p>
            <div className="flex gap-2.5">
              {RATIOS.map((ratio) => {
                const isActive = config.aspectRatio === ratio
                const [w, h] = ratio.split(":").map(Number)
                const previewW = Math.min(w * 4, 36)
                const previewH = Math.min(h * 4, 36)
                return (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setConfigValue("aspectRatio", ratio)}
                    className={`flex flex-1 items-center justify-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "border-cyan-400/40 bg-cyan-950/20 text-white ring-2 ring-cyan-400/20 ring-offset-2 ring-offset-[#020617]"
                        : "border-zinc-800/80 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/50 hover:text-zinc-300"
                    }`}
                  >
                    {/* Ratio icon */}
                    <div
                      className={`rounded-sm border transition-colors duration-200 ${
                        isActive ? "border-cyan-400/60 bg-cyan-400/10" : "border-zinc-700 bg-zinc-800"
                      }`}
                      style={{ width: previewW, height: previewH }}
                    />
                    <span className="text-xs tracking-wide">{ratio}</span>
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        {/* Right: Colors + CTA */}
        <section className="grid gap-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-5">
          {/* Wave color */}
          <div className="grid gap-2.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
              Cor da onda
            </span>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setConfigValue("primaryColor", color)}
                  className={`h-8 w-8 rounded-lg transition-all duration-150 ${
                    config.primaryColor === color
                      ? "ring-2 ring-white/30 ring-offset-2 ring-offset-[#020617] scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Cor da onda: ${color}`}
                />
              ))}
              {/* Custom color picker */}
              <label
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-300"
                title="Cor personalizada"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <input
                  type="color"
                  value={config.primaryColor}
                  onChange={(e) => setConfigValue("primaryColor", e.target.value)}
                  className="sr-only"
                  tabIndex={-1}
                />
              </label>
            </div>
          </div>

          {/* Background color */}
          <div className="grid gap-2.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
              Cor de fundo
            </span>
            <div className="flex flex-wrap gap-2">
              {BG_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setConfigValue("backgroundColor", color)}
                  className={`h-8 w-8 rounded-lg border transition-all duration-150 ${
                    config.backgroundColor === color
                      ? "ring-2 ring-white/30 ring-offset-2 ring-offset-[#020617] scale-110"
                      : "border-zinc-700/50 hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Cor de fundo: ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-zinc-800/60" />

          {/* CTA */}
          <button
            type="button"
            onClick={onNext}
            className="group relative overflow-hidden rounded-xl bg-cyan-400 px-5 py-3.5 font-semibold text-zinc-950 transition-all duration-200 hover:bg-cyan-300 hover:shadow-[0_0_24px_rgba(34,211,238,0.25)]"
          >
            <span className="relative z-[1] tracking-wide">Continuar para exportacao</span>
          </button>
        </section>
      </div>
    </div>
  )
}
