import asyncio
import uuid
from pathlib import Path
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse

from app.auth.dependencies import get_current_user
from app.jobs import job_store
from app.services.audio import AudioService
from app.services.renderer import RendererService, get_dimensions
from app.services.exporter import ExporterService
from app.db.connection import get_connection
from app.db.models import ExportCreate

router = APIRouter(prefix="/exports", tags=["exports"])

# Use absolute paths to avoid issues with cwd changes during ffmpeg execution
_BACKEND_DIR = Path(__file__).resolve().parents[2]
UPLOAD_DIR = _BACKEND_DIR / "uploads"
OUTPUT_DIR = _BACKEND_DIR / "outputs"
MAX_AUDIO_BYTES = 50 * 1024 * 1024
ACCEPTED_AUDIO_TYPES = {
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "audio/mp4",
    "audio/ogg",
    "audio/aac",
}

# Database connection getter -- override in tests to inject in-memory db
_db_getter = get_connection


async def process_export_job(
    job_id: str,
    user_id: str,
    audio_path: str,
    format: str,
    duration: int,
    style: str,
    aspect_ratio: str,
    primary_color: str,
    background_color: str,
) -> None:
    """Background task that runs the full export pipeline."""
    audio_service = AudioService()
    renderer = RendererService()

    try:
        # 1. Mark as processing
        job_store.update(job_id, status="processing", progress=0)

        # 2. Audio: load and extract amplitudes (progress: 10-20%)
        job_store.update(job_id, progress=10)
        audio = audio_service.load_audio(audio_path)
        audio_data = audio_service.extract_amplitudes(audio)
        amplitudes = audio_data["amplitudes"]
        job_store.update(job_id, progress=20)

        # 3. Renderer: render all frames (progress: 20-80%)
        width, height = get_dimensions(aspect_ratio)
        frames_dir = OUTPUT_DIR / job_id / "frames"
        frames_dir.mkdir(parents=True, exist_ok=True)

        frame_paths = renderer.render_all_frames(
            amplitudes=amplitudes,
            style=style,
            primary_color=primary_color,
            background_color=background_color,
            width=width,
            height=height,
            output_dir=str(frames_dir),
        )
        job_store.update(job_id, progress=80)

        # 4. Exporter: encode to MP4/GIF (progress: 80-95%)
        exporter = ExporterService()
        output_file = OUTPUT_DIR / job_id / f"output.{format}"
        output_file.parent.mkdir(parents=True, exist_ok=True)

        exporter.export(
            frame_dir=frames_dir,
            audio_path=audio_path,
            output_path=output_file,
            format=format,
        )
        job_store.update(job_id, progress=95)

        # 5. Record in DB (progress: 95-100%)
        conn = _db_getter()
        try:
            export_data = ExportCreate(
                user_id=user_id,
                format=format,
                duration=duration,
                style=style,
                aspect_ratio=aspect_ratio,
            )
            export_id = str(uuid.uuid4())
            conn.execute(
                "INSERT INTO exports (id, user_id, format, duration, style, aspect_ratio) VALUES (?, ?, ?, ?, ?, ?)",
                (export_id, user_id, export_data.format, export_data.duration, export_data.style, export_data.aspect_ratio),
            )
            conn.commit()
        finally:
            conn.close()

        # 6. Mark as completed
        job_store.update(
            job_id,
            status="completed",
            progress=100,
            output_file_path=str(output_file),
        )

    except Exception as exc:
        job_store.update(
            job_id,
            status="failed",
            error_message=str(exc),
        )


@router.post("", status_code=202)
async def create_export(
    audio: UploadFile = File(...),
    format: Annotated[Literal["mp4", "gif"], Form()] = "mp4",
    duration: Annotated[int, Form(ge=1)] = 30,
    style: Annotated[Literal["bars", "line", "mirror"], Form()] = "bars",
    aspect_ratio: Annotated[Literal["16:9", "9:16", "1:1"], Form()] = "16:9",
    primary_color: Annotated[str, Form(pattern=r"^#[0-9A-Fa-f]{6}$")] = "#FF5733",
    background_color: Annotated[str, Form(pattern=r"^#[0-9A-Fa-f]{6}$")] = "#000000",
    user_id: str = Depends(get_current_user),
):
    """Start an export job. Returns immediately with job_id."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    if audio.content_type not in ACCEPTED_AUDIO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported audio file type",
        )

    # Save uploaded audio with unique name
    original_name = Path(audio.filename).stem if audio.filename else "audio"
    ext = Path(audio.filename).suffix if audio.filename else ".wav"
    audio_filename = f"{uuid.uuid4()}-{original_name}{ext}"
    audio_path = UPLOAD_DIR / audio_filename

    total_bytes = 0
    with audio_path.open("wb") as buffer:
        while chunk := await audio.read(1024 * 1024):
            total_bytes += len(chunk)
            if total_bytes > MAX_AUDIO_BYTES:
                buffer.close()
                audio_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail="Audio file exceeds 50MB limit",
                )
            buffer.write(chunk)

    # Create job
    job = job_store.create(
        user_id=user_id,
        format=format,
        duration=duration,
        style=style,
        aspect_ratio=aspect_ratio,
    )
    job_store.update(job.id, audio_file_path=str(audio_path))

    # Kick off background task
    asyncio.create_task(
        process_export_job(
            job_id=job.id,
            user_id=user_id,
            audio_path=str(audio_path),
            format=format,
            duration=duration,
            style=style,
            aspect_ratio=aspect_ratio,
            primary_color=primary_color,
            background_color=background_color,
        )
    )

    return {"job_id": job.id, "status": "pending"}


@router.get("/{job_id}/status")
async def get_job_status(
    job_id: str,
    user_id: str = Depends(get_current_user),
):
    """Get job status. 404 if not found, 403 if not owned by user."""
    job = job_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this job")

    return {
        "job_id": job.id,
        "status": job.status,
        "progress": job.progress,
        "format": job.format,
        "style": job.style,
        "aspect_ratio": job.aspect_ratio,
        "duration": job.duration,
        "audio_file_path": job.audio_file_path,
        "output_file_path": job.output_file_path,
        "error_message": job.error_message,
        "created_at": job.created_at.isoformat(),
        "updated_at": job.updated_at.isoformat(),
    }


@router.get("/{job_id}/download")
async def download_export(
    job_id: str,
    user_id: str = Depends(get_current_user),
):
    """Download the output file. 404 if not ready, 403 if not owned."""
    job = job_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this job")

    if job.status != "completed" or not job.output_file_path:
        raise HTTPException(status_code=404, detail="Export not ready")

    output_path = Path(job.output_file_path)
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Output file not found")

    media_type_map = {
        "mp4": "video/mp4",
        "gif": "image/gif",
    }
    media_type = media_type_map.get(job.format, "application/octet-stream")

    return FileResponse(path=str(output_path), media_type=media_type, filename=output_path.name)
