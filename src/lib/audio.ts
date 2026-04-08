import type { AudioData } from "@/types"

export const FRAMES_PER_SECOND = 30

/** Extracts RMS amplitude per frame from an AudioBuffer. */
export function extractAmplitudes(buffer: AudioBuffer, fps: number = FRAMES_PER_SECOND): AudioData {
  const channelData     = buffer.getChannelData(0)
  const sampleRate      = buffer.sampleRate
  const duration        = buffer.duration
  const frameCount      = Math.ceil(duration * fps)
  const samplesPerFrame = Math.floor(sampleRate / fps)
  const amplitudes      = new Float32Array(frameCount)

  for (let i = 0; i < frameCount; i++) {
    const start = i * samplesPerFrame
    const end   = Math.min(start + samplesPerFrame, channelData.length)
    let sumSq   = 0
    for (let j = start; j < end; j++) {
      sumSq += channelData[j] * channelData[j]
    }
    amplitudes[i] = Math.sqrt(sumSq / (end - start))
  }

  // normalize to 0–1
  const max = Math.max(...amplitudes)
  if (max > 0) {
    for (let i = 0; i < amplitudes.length; i++) {
      amplitudes[i] /= max
    }
  }

  return { amplitudes, duration, sampleRate, frameCount }
}

/** Decodes a File to AudioBuffer, then extracts amplitudes. */
export async function decodeAudio(file: File): Promise<AudioData> {
  const arrayBuffer  = await file.arrayBuffer()
  const audioContext = new AudioContext()
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    return extractAmplitudes(audioBuffer, FRAMES_PER_SECOND)
  } finally {
    await audioContext.close()
  }
}
