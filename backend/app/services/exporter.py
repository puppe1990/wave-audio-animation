import shutil
import subprocess
from pathlib import Path


class ExporterService:
    """Encode rendered frames + audio into MP4 or GIF using ffmpeg CLI."""

    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        if not shutil.which(ffmpeg_path):
            raise RuntimeError("ffmpeg not found on PATH")
        self.ffmpeg_path = ffmpeg_path

    def _run(self, args: list[str], cwd: str | Path | None = None) -> subprocess.CompletedProcess:
        """Run ffmpeg with the given args. Raise on non-zero exit."""
        return subprocess.run(
            [self.ffmpeg_path] + args,
            check=True,
            capture_output=True,
            cwd=cwd,
        )

    def export_mp4(
        self,
        frame_dir: str | Path,
        audio_path: str | Path,
        output_path: str | Path,
        fps: int = 30,
    ) -> Path:
        """Encode frames + audio into MP4 (H.264 + AAC)."""
        frame_dir = Path(frame_dir)
        output_path = Path(output_path)

        self._run(
            [
                "-framerate", str(fps),
                "-i", "frame_%06d.png",
                "-i", str(audio_path),
                "-c:v", "libx264",
                "-c:a", "aac",
                "-pix_fmt", "yuv420p",
                "-crf", "23",
                "-shortest",
                "-y",
                str(output_path),
            ],
            cwd=frame_dir,
        )
        return output_path

    def export_gif(
        self,
        frame_dir: str | Path,
        output_path: str | Path,
        fps: int = 30,
        output_fps: int = 15,
    ) -> Path:
        """Encode frames into GIF with palette optimization (two-pass)."""
        frame_dir = Path(frame_dir)
        output_path = Path(output_path)
        palette_path = frame_dir / "palette.png"

        try:
            # Pass 1: generate optimal palette
            self._run(
                [
                    "-framerate", str(fps),
                    "-i", "frame_%06d.png",
                    "-vf", "palettegen",
                    "-y",
                    str(palette_path),
                ],
                cwd=frame_dir,
            )

            # Pass 2: encode using the generated palette
            self._run(
                [
                    "-framerate", str(fps),
                    "-i", "frame_%06d.png",
                    "-i", str(palette_path),
                    "-lavfi", "paletteuse",
                    "-r", str(output_fps),
                    "-y",
                    str(output_path),
                ],
                cwd=frame_dir,
            )
        finally:
            # Always clean up the intermediate palette
            if palette_path.exists():
                palette_path.unlink()

        return output_path

    def export(
        self,
        frame_dir: str | Path,
        audio_path: str | Path,
        output_path: str | Path,
        format: str,
        fps: int = 30,
    ) -> Path:
        """Dispatch to the correct export method based on format."""
        fmt = format.lower()
        if fmt == "mp4":
            return self.export_mp4(frame_dir, audio_path, output_path, fps=fps)
        elif fmt == "gif":
            return self.export_gif(frame_dir, output_path, fps=fps)
        else:
            raise ValueError(f"Unknown export format: {format!r}")


exporter_service = ExporterService()
