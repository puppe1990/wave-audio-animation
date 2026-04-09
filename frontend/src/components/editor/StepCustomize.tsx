"use client"

import type { ComponentType } from "react"
import type { AspectRatio, EditorConfig, WaveStyle } from "@/types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

const STYLES: Array<{ key: WaveStyle; label: string }> = [
  { key: "bars", label: "Barras" },
  { key: "line", label: "Linha" },
  { key: "mirror", label: "Espelho" },
]

const RATIOS: AspectRatio[] = ["16:9", "9:16", "1:1"]

const COLOR_PRESETS = [
  "#22d3ee",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#fbbf24",
  "#f87171",
  "#e2e8f0",
]

const BG_PRESETS = [
  "#020617",
  "#0a0a0a",
  "#0f172a",
  "#1a0a2e",
  "#0a1a0f",
  "#1a0505",
]

interface Props {
  config: EditorConfig
  onChange: (config: EditorConfig) => void
  onNext: () => void
}

function BarsPreview({ primaryColor }: { primaryColor: string }) {
  const bars = [30, 55, 40, 70, 45, 85, 50, 65, 75, 40, 60, 50]

  return (
    <div className="flex items-end justify-center gap-[3px]" style={{ height: 64 }}>
      {bars.map((height, index) => (
        <div
          key={index}
          className="w-[3px] rounded-full transition-colors duration-300"
          style={{
            height: `${height}%`,
            backgroundColor: primaryColor,
            opacity: 0.4 + (index / bars.length) * 0.6,
          }}
        />
      ))}
    </div>
  )
}

function LinePreview({ primaryColor }: { primaryColor: string }) {
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

function MirrorPreview({ primaryColor }: { primaryColor: string }) {
  const bars = [20, 40, 30, 50, 35, 60, 45]

  return (
    <div className="flex flex-col items-center justify-center gap-0" style={{ height: 64 }}>
      <div className="flex items-end gap-[3px]">
        {bars.map((height, index) => (
          <div
            key={`top-${index}`}
            className="w-[3px] rounded-t-full transition-colors duration-300"
            style={{
              height: `${height}%`,
              backgroundColor: primaryColor,
              opacity: 0.4 + (index / bars.length) * 0.6,
            }}
          />
        ))}
      </div>
      <div className="h-px w-full opacity-30" style={{ backgroundColor: primaryColor }} />
      <div className="flex items-start gap-[3px]">
        {bars.map((height, index) => (
          <div
            key={`bottom-${index}`}
            className="w-[3px] rounded-b-full transition-colors duration-300"
            style={{
              height: `${height}%`,
              backgroundColor: primaryColor,
              opacity: 0.4 + (index / bars.length) * 0.6,
              transform: "scaleY(-1)",
            }}
          />
        ))}
      </div>
    </div>
  )
}

const STYLE_PREVIEWS: Record<WaveStyle, ComponentType<{ primaryColor: string }>> = {
  bars: BarsPreview,
  line: LinePreview,
  mirror: MirrorPreview,
}

export function StepCustomize({ config, onChange, onNext }: Props) {
  function setConfigValue<Key extends keyof EditorConfig>(key: Key, value: EditorConfig[Key]) {
    onChange({ ...config, [key]: value })
  }

  const StylePreview = STYLE_PREVIEWS[config.style]

  return (
    <div className="grid gap-6 animate-fade-in-up lg:grid-cols-[1fr_210px]">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
            Estilo da onda
          </Label>
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
                  <div className={`transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-40"}`}>
                    <PreviewComponent primaryColor={isActive ? config.primaryColor : "#52525b"} />
                  </div>
                  <span className="text-xs tracking-wide">{label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <Separator className="bg-zinc-800" />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
              Cor da onda
            </Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setConfigValue("primaryColor", color)}
                  className={`h-7 w-7 rounded-lg transition-all duration-150 ${
                    config.primaryColor === color
                      ? "scale-110 ring-2 ring-white/30 ring-offset-2 ring-offset-[#020617]"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Cor da onda: ${color}`}
                />
              ))}
              <label
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-300"
                title="Cor personalizada"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <input
                  type="color"
                  value={config.primaryColor}
                  onChange={(event) => setConfigValue("primaryColor", event.target.value)}
                  className="sr-only"
                  tabIndex={-1}
                />
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
              Cor de fundo
            </Label>
            <div className="flex flex-wrap gap-2">
              {BG_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setConfigValue("backgroundColor", color)}
                  className={`h-7 w-7 rounded-lg border transition-all duration-150 ${
                    config.backgroundColor === color
                      ? "scale-110 ring-2 ring-white/30 ring-offset-2 ring-offset-[#020617]"
                      : "border-zinc-700/50 hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Cor de fundo: ${color}`}
                />
              ))}
            </div>
          </div>
        </div>

        <Separator className="bg-zinc-800" />

        <div className="flex flex-col gap-2">
          <Label className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
            Proporção
          </Label>
          <div className="flex gap-2.5">
            {RATIOS.map((ratio) => {
              const isActive = config.aspectRatio === ratio
              const [width, height] = ratio.split(":").map(Number)
              const previewWidth = Math.min(width * 4, 36)
              const previewHeight = Math.min(height * 4, 36)

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
                  <div
                    className={`rounded-sm border transition-colors duration-200 ${
                      isActive ? "border-cyan-400/60 bg-cyan-400/10" : "border-zinc-700 bg-zinc-800"
                    }`}
                    style={{ width: previewWidth, height: previewHeight }}
                  />
                  <span className="text-xs tracking-wide">{ratio}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Label className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
          Preview
        </Label>
        <div
          className="flex flex-1 items-center justify-center rounded-xl border border-zinc-800 p-4"
          style={{ backgroundColor: config.backgroundColor, minHeight: 120 }}
        >
          <StylePreview primaryColor={config.primaryColor} />
        </div>
        <p className="text-center text-[10px] text-zinc-600">
          {config.style} · {config.aspectRatio}
        </p>
        <Button
          type="button"
          onClick={onNext}
          className="w-full bg-cyan-400 font-semibold text-zinc-950 hover:bg-cyan-300 hover:shadow-[0_0_24px_rgba(34,211,238,0.25)]"
        >
          Continuar →
        </Button>
      </div>
    </div>
  )
}
