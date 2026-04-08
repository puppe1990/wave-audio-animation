import os
import tempfile

import pytest
from PIL import Image

from app.services.renderer import (
    RendererService,
    get_dimensions,
)


class TestGetDimensions:
    def test_16_9(self):
        assert get_dimensions("16:9") == (1280, 720)

    def test_9_16(self):
        assert get_dimensions("9:16") == (720, 1280)

    def test_1_1(self):
        assert get_dimensions("1:1") == (800, 800)


class TestDrawFrame:
    @pytest.fixture
    def renderer(self):
        return RendererService()

    @pytest.fixture
    def amplitudes(self):
        # 100 frames of varying amplitudes
        return [0.3, 0.5, 0.8, 0.2, 0.6, 0.9, 0.4, 0.7, 0.1, 0.5] * 10

    def test_bars_returns_image(self, renderer, amplitudes):
        img = renderer.draw_frame(
            amplitudes=amplitudes,
            frame_index=50,
            style="bars",
            primary_color="#FF5733",
            background_color="#1A1A2E",
            width=1280,
            height=720,
        )
        assert isinstance(img, Image.Image)
        assert img.size == (1280, 720)
        assert img.mode == "RGB"

    def test_line_returns_image(self, renderer, amplitudes):
        img = renderer.draw_frame(
            amplitudes=amplitudes,
            frame_index=50,
            style="line",
            primary_color="#FF5733",
            background_color="#1A1A2E",
            width=1280,
            height=720,
        )
        assert isinstance(img, Image.Image)
        assert img.size == (1280, 720)
        assert img.mode == "RGB"

    def test_mirror_returns_image(self, renderer, amplitudes):
        img = renderer.draw_frame(
            amplitudes=amplitudes,
            frame_index=50,
            style="mirror",
            primary_color="#FF5733",
            background_color="#1A1A2E",
            width=1280,
            height=720,
        )
        assert isinstance(img, Image.Image)
        assert img.size == (1280, 720)
        assert img.mode == "RGB"

    def test_empty_amplitudes_produces_valid_image(self, renderer):
        amplitudes = [0.0] * 100
        img = renderer.draw_frame(
            amplitudes=amplitudes,
            frame_index=50,
            style="bars",
            primary_color="#FF5733",
            background_color="#1A1A2E",
            width=1280,
            height=720,
        )
        assert isinstance(img, Image.Image)
        assert img.size == (1280, 720)

    def test_background_color_fills_entire_frame(self, renderer):
        """Verify the background color fills the entire frame."""
        amplitudes = [0.0] * 100  # No waveform content
        img = renderer.draw_frame(
            amplitudes=amplitudes,
            frame_index=50,
            style="bars",
            primary_color="#FF5733",
            background_color="#1A1A2E",
            width=1280,
            height=720,
        )
        # Sample several pixels to verify background color
        pixels = img.load()
        bg_color = (26, 26, 46)  # #1A1A2E in RGB
        # Check corners and center
        for x, y in [(0, 0), (1279, 0), (0, 719), (1279, 719), (640, 360)]:
            assert pixels[x, y] == bg_color, (
                f"Pixel at ({x}, {y}) is {pixels[x, y]}, expected {bg_color}"
            )


class TestRenderAllFrames:
    @pytest.fixture
    def renderer(self):
        return RendererService()

    @pytest.fixture
    def amplitudes(self):
        return [0.3, 0.5, 0.8, 0.2, 0.6, 0.9, 0.4, 0.7, 0.1, 0.5] * 10

    def test_render_all_frames_saves_files(self, renderer, amplitudes):
        with tempfile.TemporaryDirectory() as tmpdir:
            paths = renderer.render_all_frames(
                amplitudes=amplitudes,
                style="bars",
                primary_color="#FF5733",
                background_color="#1A1A2E",
                width=1280,
                height=720,
                output_dir=tmpdir,
            )

            # Should have one frame per amplitude value
            assert len(paths) == len(amplitudes)

            # All files should exist
            for path in paths:
                assert os.path.exists(path), f"File not found: {path}"

            # Verify naming convention (frame_000001.png, frame_000002.png, etc.)
            assert paths[0].endswith("frame_000001.png")
            assert paths[-1].endswith(f"frame_{len(amplitudes):06d}.png")

    def test_render_all_frames_returns_correct_paths(self, renderer, amplitudes):
        with tempfile.TemporaryDirectory() as tmpdir:
            paths = renderer.render_all_frames(
                amplitudes=amplitudes,
                style="bars",
                primary_color="#FF5733",
                background_color="#1A1A2E",
                width=1280,
                height=720,
                output_dir=tmpdir,
            )

            for i, path in enumerate(paths, start=1):
                expected_name = f"frame_{i:06d}.png"
                assert path.endswith(expected_name), (
                    f"Expected {expected_name}, got {os.path.basename(path)}"
                )

    def test_render_all_frames_creates_output_dir(self, renderer, amplitudes):
        with tempfile.TemporaryDirectory() as tmpdir:
            nested_dir = os.path.join(tmpdir, "frames", "output")
            paths = renderer.render_all_frames(
                amplitudes=amplitudes,
                style="bars",
                primary_color="#FF5733",
                background_color="#1A1A2E",
                width=1280,
                height=720,
                output_dir=nested_dir,
            )

            assert os.path.exists(nested_dir)
            assert len(paths) == len(amplitudes)

    def test_render_all_frames_images_have_correct_dimensions(
        self, renderer, amplitudes
    ):
        with tempfile.TemporaryDirectory() as tmpdir:
            paths = renderer.render_all_frames(
                amplitudes=amplitudes,
                style="bars",
                primary_color="#FF5733",
                background_color="#1A1A2E",
                width=1280,
                height=720,
                output_dir=tmpdir,
            )

            for path in paths:
                img = Image.open(path)
                assert img.size == (1280, 720)
                img.close()
