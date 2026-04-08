import math
import struct
from pathlib import Path

from pydub import AudioSegment

FRAMES_PER_SECOND = 30


class AudioService:
    """Extract RMS amplitude data from audio files, matching the client-side audio.ts logic."""

    def load_audio(self, file_path: str | Path) -> AudioSegment:
        """Load an audio file. Auto-detects format from extension."""
        path = Path(file_path)
        ext = path.suffix.lower().lstrip(".")

        format_map = {
            "mp3": "mp3",
            "wav": "wav",
            "ogg": "ogg",
            "m4a": "m4a",
            "flac": "flac",
        }

        fmt = format_map.get(ext)
        if fmt is None:
            supported = ", ".join(format_map.keys())
            raise ValueError(f"Unsupported audio format '.{ext}'. Supported: {supported}")

        return AudioSegment.from_file(str(path), format=fmt)

    def _unpack_samples(self, audio: AudioSegment) -> list[int]:
        """Unpack raw audio bytes into a list of signed integer samples."""
        raw_data = audio.raw_data
        sample_width = audio.sample_width  # 1, 2, or 4 bytes per sample
        num_samples = len(raw_data) // sample_width
        trimmed = raw_data[: num_samples * sample_width]

        if sample_width == 1:
            fmt = f"<{num_samples}B"  # unsigned bytes
        elif sample_width == 2:
            fmt = f"<{num_samples}h"  # signed shorts
        elif sample_width == 4:
            fmt = f"<{num_samples}i"  # signed ints
        else:
            raise ValueError(f"Unsupported sample width: {sample_width}")

        return list(struct.unpack(fmt, trimmed))

    def extract_amplitudes(self, audio: AudioSegment, fps: int = FRAMES_PER_SECOND) -> dict:
        """Extract RMS amplitude per frame, normalized to 0-1.

        Returns dict with:
          - amplitudes: list[float]  (normalized 0-1)
          - duration: float  (seconds)
          - sample_rate: int
          - frame_count: int

        Logic (matching TypeScript):
          - samples_per_frame = sample_rate / fps
          - For each frame: RMS = sqrt(sum(sample^2 for sample in frame) / sample_count)
          - Normalize: divide all by max if max > 0
        """
        samples = self._unpack_samples(audio)
        sample_rate = audio.frame_rate
        duration_seconds = audio.duration_seconds

        samples_per_frame = sample_rate // fps
        frame_count = math.ceil(duration_seconds * fps)

        # Calculate RMS per frame
        amplitudes: list[float] = []
        for i in range(frame_count):
            start = i * samples_per_frame
            end = start + samples_per_frame
            frame_samples = samples[start:end]

            if not frame_samples:
                amplitudes.append(0.0)
                continue

            rms = math.sqrt(sum(s * s for s in frame_samples) / len(frame_samples))
            amplitudes.append(rms)

        # Normalize to 0-1
        max_amp = max(amplitudes) if amplitudes else 0.0
        if max_amp > 0:
            amplitudes = [a / max_amp for a in amplitudes]

        return {
            "amplitudes": amplitudes,
            "duration": duration_seconds,
            "sample_rate": sample_rate,
            "frame_count": frame_count,
        }

    def process_file(self, file_path: str | Path) -> dict:
        """Load audio and extract amplitudes in one call."""
        audio = self.load_audio(file_path)
        return self.extract_amplitudes(audio)


audio_service = AudioService()
