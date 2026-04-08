import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal


JobStatus = Literal["pending", "processing", "completed", "failed"]


@dataclass
class Job:
    id: str
    user_id: str
    status: JobStatus = "pending"
    format: str = "mp4"
    duration: int = 30
    style: str = "bars"
    aspect_ratio: str = "16:9"
    audio_file_path: str | None = None
    output_file_path: str | None = None
    error_message: str | None = None
    progress: float = 0.0
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class JobStore:
    """In-memory job store with basic CRUD and status updates."""

    def __init__(self):
        self._jobs: dict[str, Job] = {}

    def create(
        self, user_id: str, format: str, duration: int, style: str, aspect_ratio: str
    ) -> Job:
        """Create a new job, return it."""
        job = Job(
            id=str(uuid.uuid4()),
            user_id=user_id,
            format=format,
            duration=duration,
            style=style,
            aspect_ratio=aspect_ratio,
        )
        self._jobs[job.id] = job
        return job

    def get(self, job_id: str) -> Job | None:
        """Get a job by ID, return None if not found."""
        return self._jobs.get(job_id)

    def update(self, job_id: str, **kwargs) -> Job | None:
        """Update job fields (status, progress, error_message, audio_file_path, output_file_path).
        Automatically sets updated_at. Returns updated job or None."""
        job = self._jobs.get(job_id)
        if job is None:
            return None
        for key, value in kwargs.items():
            if hasattr(job, key):
                setattr(job, key, value)
        job.updated_at = datetime.now(timezone.utc)
        return job

    def delete(self, job_id: str) -> bool:
        """Delete a job, return True if it existed."""
        return self._jobs.pop(job_id, None) is not None

    def list_by_user(self, user_id: str) -> list[Job]:
        """List all jobs for a user, most recent first."""
        user_jobs = [j for j in self._jobs.values() if j.user_id == user_id]
        user_jobs.sort(key=lambda j: j.created_at, reverse=True)
        return user_jobs
