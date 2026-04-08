import subprocess
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest
from PIL import Image
from pydub import AudioSegment

from app.services.exporter import ExporterService


@pytest.fixture
def exporter():
    return ExporterService()


@pytest.fixture
def frame_dir(tmp_path: Path) -> Path:
    """Create 10 test frames (simple colored rectangles)."""
    d = tmp_path / "frames"
    d.mkdir()
    for i in range(1, 11):
        color = (i * 25 % 256, i * 37 % 256, i * 53 % 256)
        img = Image.new("RGB", (320, 240), color)
        img.save(d / f"frame_{i:06d}.png", "PNG")
    return d


@pytest.fixture
def audio_file(tmp_path: Path) -> Path:
    """Generate a 1-second silence WAV file."""
    silent = AudioSegment.silent(duration=1000, frame_rate=44100)
    path = tmp_path / "silence.wav"
    silent.export(str(path), format="wav")
    return path


# ── Constructor tests ──────────────────────────────────────────────────────


class TestExporterServiceInit:
    def test_raises_when_ffmpeg_not_found(self):
        with patch("app.services.exporter.shutil.which", return_value=None):
            with pytest.raises(RuntimeError, match="ffmpeg not found on PATH"):
                ExporterService()

    def test_succeeds_when_ffmpeg_found(self):
        # Should not raise
        service = ExporterService()
        assert service.ffmpeg_path == "ffmpeg"


# ── export_mp4 tests ───────────────────────────────────────────────────────


class TestExportMp4:
    def test_export_mp4_creates_output(self, exporter: ExporterService, frame_dir: Path, audio_file: Path, tmp_path: Path):
        output = tmp_path / "output.mp4"
        result = exporter.export_mp4(frame_dir, audio_file, output, fps=10)

        assert result == output
        assert output.exists()
        assert output.stat().st_size > 0

    def test_export_mp4_magic_bytes(self, exporter: ExporterService, frame_dir: Path, audio_file: Path, tmp_path: Path):
        output = tmp_path / "output.mp4"
        exporter.export_mp4(frame_dir, audio_file, output, fps=10)

        # MP4 files start with a box size (4 bytes) followed by 'ftyp'
        with open(output, "rb") as f:
            header = f.read(8)
        # ftyp is at offset 4
        assert header[4:8] == b"ftyp", f"Expected ftyp magic bytes, got {header[4:8]}"


# ── export_gif tests ───────────────────────────────────────────────────────


class TestExportGif:
    def test_export_gif_creates_output(self, exporter: ExporterService, frame_dir: Path, tmp_path: Path):
        output = tmp_path / "output.gif"
        result = exporter.export_gif(frame_dir, output, fps=10, output_fps=5)

        assert result == output
        assert output.exists()
        assert output.stat().st_size > 0

    def test_export_gif_magic_bytes(self, exporter: ExporterService, frame_dir: Path, tmp_path: Path):
        output = tmp_path / "output.gif"
        exporter.export_gif(frame_dir, output, fps=10, output_fps=5)

        # GIF files start with 'GIF87a' or 'GIF89a'
        with open(output, "rb") as f:
            header = f.read(6)
        assert header in (b"GIF87a", b"GIF89a"), f"Expected GIF magic bytes, got {header}"

    def test_export_gif_cleans_up_palette(self, exporter: ExporterService, frame_dir: Path, tmp_path: Path):
        output = tmp_path / "output.gif"
        exporter.export_gif(frame_dir, output, fps=10, output_fps=5)

        # palette.png should not remain in frame_dir after export
        palette = frame_dir / "palette.png"
        assert not palette.exists(), "palette.png intermediate file was not cleaned up"


# ── export() dispatch tests ────────────────────────────────────────────────


class TestExportDispatch:
    def test_dispatch_mp4(self, exporter: ExporterService, frame_dir: Path, audio_file: Path, tmp_path: Path):
        output = tmp_path / "output.mp4"
        result = exporter.export(frame_dir, audio_file, output, format="mp4", fps=10)
        assert result.exists()
        assert result.stat().st_size > 0

    def test_dispatch_gif(self, exporter: ExporterService, frame_dir: Path, tmp_path: Path):
        output = tmp_path / "output.gif"
        # export_gif does not need audio
        result = exporter.export(frame_dir, "", output, format="gif", fps=10)
        assert result.exists()
        assert result.stat().st_size > 0

    def test_dispatch_unknown_format_raises(self, exporter: ExporterService, frame_dir: Path, audio_file: Path, tmp_path: Path):
        output = tmp_path / "output.xyz"
        with pytest.raises(ValueError, match="Unknown export format"):
            exporter.export(frame_dir, audio_file, output, format="xyz", fps=10)
