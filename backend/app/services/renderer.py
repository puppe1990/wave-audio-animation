from PIL import Image, ImageDraw
import os


ASPECT_RATIO_DIMENSIONS = {
    "16:9": (1280, 720),
    "9:16": (720, 1280),
    "1:1":  (800, 800),
}


def get_dimensions(aspect_ratio: str) -> tuple[int, int]:
    return ASPECT_RATIO_DIMENSIONS[aspect_ratio]


class RendererService:
    def draw_frame(
        self,
        amplitudes: list[float],
        frame_index: int,
        style: str,          # "bars", "line", "mirror"
        primary_color: str,  # hex like "#FF5733"
        background_color: str,
        width: int,
        height: int,
    ) -> Image.Image:
        """Draw a single frame and return the PIL Image."""
        img = Image.new("RGB", (width, height), background_color)
        draw = ImageDraw.Draw(img)

        if style == "bars":
            self._draw_bars(draw, amplitudes, frame_index, primary_color, width, height)
        elif style == "line":
            self._draw_line(draw, amplitudes, frame_index, primary_color, width, height)
        elif style == "mirror":
            self._draw_mirror(draw, amplitudes, frame_index, primary_color, width, height)

        return img

    def _draw_bars(self, draw: ImageDraw.ImageDraw, amplitudes: list[float], frame_index: int, color: str, width: int, height: int):
        """64 bars with rounded rectangle radius 4, matching TypeScript exactly."""
        bar_count = 64
        bar_w = (width / bar_count) * 0.6
        gap = (width / bar_count) * 0.4
        half = bar_count // 2

        for i in range(bar_count):
            idx = max(0, min(len(amplitudes) - 1, frame_index - half + i))
            amp = amplitudes[idx] if idx < len(amplitudes) else 0
            bar_h = max(4, int(amp * height * 0.85))
            x = int(i * (bar_w + gap) + gap / 2)
            y = height - bar_h
            x2 = x + int(bar_w)
            y2 = height
            draw.rounded_rectangle([x, y, x2, y2], radius=4, fill=color)

    def _draw_line(self, draw: ImageDraw.ImageDraw, amplitudes: list[float], frame_index: int, color: str, width: int, height: int):
        """120-point line graph, centered, with round caps."""
        points = 120
        half = points // 2
        center_y = height / 2
        line_width = max(3, width / 400)

        coords: list[tuple[float, float]] = []
        for i in range(points):
            idx = max(0, min(len(amplitudes) - 1, frame_index - half + i))
            x = (i / (points - 1)) * width
            y = center_y - amplitudes[idx] * height * 0.4
            coords.append((x, y))

        # Draw line segments with width for the main line
        if len(coords) >= 2:
            draw.line(coords, fill=color, width=int(line_width))
            # Draw round caps at start and end
            r = line_width / 2
            for pt in [coords[0], coords[-1]]:
                draw.ellipse([pt[0] - r, pt[1] - r, pt[0] + r, pt[1] + r], fill=color)

    def _draw_mirror(self, draw: ImageDraw.ImageDraw, amplitudes: list[float], frame_index: int, color: str, width: int, height: int):
        """Mirror bars above and below center."""
        bar_count = 64
        bar_w = (width / bar_count) * 0.6
        gap = (width / bar_count) * 0.4
        half = bar_count // 2
        center_y = height // 2

        for i in range(bar_count):
            idx = max(0, min(len(amplitudes) - 1, frame_index - half + i))
            amp = amplitudes[idx] if idx < len(amplitudes) else 0
            bar_h = max(2, int(amp * height * 0.42))
            x = int(i * (bar_w + gap) + gap / 2)
            x2 = x + int(bar_w)

            # Upper bar
            draw.rounded_rectangle([x, center_y - bar_h, x2, center_y], radius=3, fill=color)
            # Lower bar
            draw.rounded_rectangle([x, center_y, x2, center_y + bar_h], radius=3, fill=color)

    def render_all_frames(
        self,
        amplitudes: list[float],
        style: str,
        primary_color: str,
        background_color: str,
        width: int,
        height: int,
        output_dir: str,
    ) -> list[str]:
        """Render ALL frames and save as PNGs. Return list of file paths."""
        os.makedirs(output_dir, exist_ok=True)

        paths: list[str] = []
        for i, amp in enumerate(amplitudes, start=1):
            img = self.draw_frame(
                amplitudes=[amp],
                frame_index=0,
                style=style,
                primary_color=primary_color,
                background_color=background_color,
                width=width,
                height=height,
            )
            filename = f"frame_{i:06d}.png"
            filepath = os.path.join(output_dir, filename)
            img.save(filepath, "PNG")
            paths.append(filepath)

        return paths


renderer_service = RendererService()
