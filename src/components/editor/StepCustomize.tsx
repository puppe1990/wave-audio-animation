"use client"

import { WaveformPreview } from "./WaveformPreview"
import type { AspectRatio, AudioData, EditorConfig, WaveStyle } from "@/types"

const STYLES: Array<{ key: WaveStyle; label: string }> = [
  { key: "bars", label: "Barras" },
  { key: "line", label: "Linha" },
  { key: "mirror", label: "Espelho" },
]

const RATIOS: AspectRatio[] = ["16:9", "9:16", "1:1"]

interface Props {
  audioData: AudioData
  config: EditorConfig
  onChange: (config: EditorConfig) => void
  onNext: () => void
}

export function StepCustomize({ audioData, config, onChange, onNext }: Props) {
  function setConfigValue<Key extends keyof EditorConfig>(key: Key, value: EditorConfig[Key]) {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <WaveformPreview audioData={audioData} config={config} />

      <div className="grid gap-6 rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <section>
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-zinc-500">Estilo</p>
            <div className="flex flex-wrap gap-3">
              {STYLES.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setConfigValue("style", key)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    config.style === key
                      ? "bg-cyan-400 text-zinc-950"
                      : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-zinc-500">Proporção</p>
            <div className="flex flex-wrap gap-3">
              {RATIOS.map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setConfigValue("aspectRatio", ratio)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    config.aspectRatio === ratio
                      ? "bg-cyan-400 text-zinc-950"
                      : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="grid gap-5 rounded-2xl bg-zinc-900/70 p-5">
          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.3em] text-zinc-500">Cor da onda</span>
            <input
              type="color"
              value={config.primaryColor}
              onChange={(event) => setConfigValue("primaryColor", event.target.value)}
              className="h-12 w-full cursor-pointer rounded-xl border border-zinc-700 bg-transparent"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.3em] text-zinc-500">Cor de fundo</span>
            <input
              type="color"
              value={config.backgroundColor}
              onChange={(event) => setConfigValue("backgroundColor", event.target.value)}
              className="h-12 w-full cursor-pointer rounded-xl border border-zinc-700 bg-transparent"
            />
          </label>

          <button
            type="button"
            onClick={onNext}
            className="mt-2 rounded-2xl bg-cyan-400 px-5 py-3 font-semibold text-zinc-950 transition hover:bg-cyan-300"
          >
            Continuar para exportação
          </button>
        </section>
      </div>
    </div>
  )
}
