import math
from pathlib import Path

import numpy as np
import pytest
from pydub import AudioSegment
from scipy.io import wavfile

from app.services.audio import AudioService, FRAMES_PER_SECOND


def _write_wav(file_path: Path, samples: np.ndarray, sample_rate: int) -> None:
    """Write a numpy array of samples as a 16-bit WAV file."""
    # Normalize to int16 range and convert
    if samples.dtype != np.int16:
        samples = np.clip(samples * 32767, -32768, 32767).astype(np.int16)
    wavfile.write(str(file_path), sample_rate, samples)


@pytest.fixture
def audio_service():
    return AudioService()


@pytest.fixture
def sine_wave_file(tmp_path: Path) -> Path:
    """Generate a 1-second 440Hz sine wave at 44100Hz sample rate."""
    duration_s = 1.0
    frequency = 440
    sample_rate = 44100

    t = np.linspace(0, duration_s, int(sample_rate * duration_s), endpoint=False)
    samples = np.sin(2 * np.pi * frequency * t)

    file_path = tmp_path / "sine_wave.wav"
    _write_wav(file_path, samples, sample_rate)
    return file_path


@pytest.fixture
def silent_audio_file(tmp_path: Path) -> Path:
    """Generate a 1-second silent audio file."""
    duration_s = 1.0
    sample_rate = 44100

    samples = np.zeros(int(sample_rate * duration_s), dtype=np.int16)

    file_path = tmp_path / "silent.wav"
    wavfile.write(str(file_path), sample_rate, samples)
    return file_path


class TestLoadAudio:
    def test_load_wav_file(self, audio_service: AudioService, sine_wave_file: Path):
        audio = audio_service.load_audio(sine_wave_file)
        assert isinstance(audio, AudioSegment)
        assert len(audio) > 0

    def test_load_file_path_object(
        self, audio_service: AudioService, sine_wave_file: Path
    ):
        audio = audio_service.load_audio(sine_wave_file)
        assert isinstance(audio, AudioSegment)

    def test_load_file_path_string(
        self, audio_service: AudioService, sine_wave_file: Path
    ):
        audio = audio_service.load_audio(str(sine_wave_file))
        assert isinstance(audio, AudioSegment)


class TestExtractAmplitudes:
    def test_returns_correct_structure(
        self, audio_service: AudioService, sine_wave_file: Path
    ):
        audio = audio_service.load_audio(sine_wave_file)
        result = audio_service.extract_amplitudes(audio)

        assert "amplitudes" in result
        assert "duration" in result
        assert "sample_rate" in result
        assert "frame_count" in result

        assert isinstance(result["amplitudes"], list)
        assert isinstance(result["duration"], float)
        assert isinstance(result["sample_rate"], int)
        assert isinstance(result["frame_count"], int)

    def test_frame_count_matches_expected(
        self, audio_service: AudioService, sine_wave_file: Path
    ):
        audio = audio_service.load_audio(sine_wave_file)
        result = audio_service.extract_amplitudes(audio)

        # 1-second audio at 30 FPS => 30 frames
        expected_frames = math.ceil(1.0 * FRAMES_PER_SECOND)
        assert result["frame_count"] == expected_frames

    def test_amplitudes_normalized(
        self, audio_service: AudioService, sine_wave_file: Path
    ):
        audio = audio_service.load_audio(sine_wave_file)
        result = audio_service.extract_amplitudes(audio)

        amplitudes = result["amplitudes"]
        assert len(amplitudes) > 0
        assert all(0.0 <= a <= 1.0 for a in amplitudes), (
            "All amplitudes must be in [0, 1]"
        )
        assert max(amplitudes) == pytest.approx(1.0), (
            "Max amplitude must be 1.0 after normalization"
        )

    def test_silent_audio_produces_near_zero_amplitudes(
        self, audio_service: AudioService, silent_audio_file: Path
    ):
        audio = audio_service.load_audio(silent_audio_file)
        result = audio_service.extract_amplitudes(audio)

        amplitudes = result["amplitudes"]
        assert all(a == 0.0 for a in amplitudes), (
            "Silent audio should produce all-zero amplitudes"
        )

    def test_sine_wave_produces_non_zero_amplitudes(
        self, audio_service: AudioService, sine_wave_file: Path
    ):
        audio = audio_service.load_audio(sine_wave_file)
        result = audio_service.extract_amplitudes(audio)

        amplitudes = result["amplitudes"]
        assert any(a > 0.0 for a in amplitudes), (
            "Sine wave should produce non-zero amplitudes"
        )

    def test_duration_matches_audio(
        self, audio_service: AudioService, sine_wave_file: Path
    ):
        audio = audio_service.load_audio(sine_wave_file)
        result = audio_service.extract_amplitudes(audio)

        # AudioSegment.duration_ms is in milliseconds
        expected_duration = audio.duration_seconds
        assert result["duration"] == pytest.approx(expected_duration, rel=1e-3)

    def test_sample_rate_matches_audio(
        self, audio_service: AudioService, sine_wave_file: Path
    ):
        audio = audio_service.load_audio(sine_wave_file)
        result = audio_service.extract_amplitudes(audio)

        assert result["sample_rate"] == audio.frame_rate

    def test_stereo_matches_mono_when_channels_are_identical(
        self, audio_service: AudioService, tmp_path: Path
    ):
        sample_rate = 30
        fps = 10

        mono_samples = np.array(
            [0.0] * 3 + [0.5] * 3 + [1.0] * 3 + [0.25] * 3, dtype=np.float32
        )
        stereo_samples = np.column_stack([mono_samples, mono_samples])

        mono_path = tmp_path / "mono.wav"
        stereo_path = tmp_path / "stereo.wav"
        _write_wav(mono_path, mono_samples, sample_rate)
        _write_wav(stereo_path, stereo_samples, sample_rate)

        mono_audio = audio_service.load_audio(mono_path)
        stereo_audio = audio_service.load_audio(stereo_path)

        mono_result = audio_service.extract_amplitudes(mono_audio, fps=fps)
        stereo_result = audio_service.extract_amplitudes(stereo_audio, fps=fps)

        assert stereo_audio.channels == 2
        assert stereo_result["frame_count"] == mono_result["frame_count"]
        assert stereo_result["amplitudes"] == pytest.approx(mono_result["amplitudes"])


class TestProcessFile:
    def test_process_file_composes_load_and_extract(
        self, audio_service: AudioService, sine_wave_file: Path
    ):
        result = audio_service.process_file(sine_wave_file)

        assert "amplitudes" in result
        assert "duration" in result
        assert "sample_rate" in result
        assert "frame_count" in result
        assert len(result["amplitudes"]) == result["frame_count"]

    def test_process_file_matches_separate_calls(
        self, audio_service: AudioService, sine_wave_file: Path
    ):
        combined = audio_service.process_file(sine_wave_file)
        audio = audio_service.load_audio(sine_wave_file)
        separate = audio_service.extract_amplitudes(audio)

        assert combined["amplitudes"] == pytest.approx(separate["amplitudes"])
        assert combined["duration"] == pytest.approx(separate["duration"])
        assert combined["sample_rate"] == separate["sample_rate"]
        assert combined["frame_count"] == separate["frame_count"]
