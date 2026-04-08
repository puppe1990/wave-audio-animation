export type WaveStyle = "bars" | "line" | "mirror"
export type AspectRatio = "16:9" | "9:16" | "1:1"
export type ExportFormat = "mp4" | "gif"

/**
 * @deprecated AudioData is no longer used by the frontend.
 * Audio processing is now handled server-side by the FastAPI backend.
 * This type is kept for reference only.
 */
export interface AudioData {
  amplitudes: Float32Array
  duration: number       // total seconds
  sampleRate: number
  frameCount: number     // total frames at 30fps
  sourceFile: File
}

export interface EditorConfig {
  style: WaveStyle
  primaryColor: string   // hex, e.g. "#6366f1"
  backgroundColor: string
  aspectRatio: AspectRatio
}

export interface RendererOptions extends EditorConfig {
  width: number
  height: number
}

export interface EditorState {
  audioFile: File
  config: EditorConfig
}

export const ASPECT_RATIO_DIMENSIONS: Record<AspectRatio, [number, number]> = {
  "16:9": [1920, 1080],
  "9:16": [1080, 1920],
  "1:1":  [1080, 1080],
}
