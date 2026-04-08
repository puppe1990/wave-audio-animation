"""Integration tests for the exports router."""

import asyncio
import io
import sqlite3

import pytest
from httpx import ASGITransport, AsyncClient
from pydub import AudioSegment

from app.auth.service import AuthService
from app.db.connection import init_db


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def db():
    """Provide an in-memory database connection with tables initialized."""
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    init_db(conn)
    yield conn
    conn.close()


@pytest.fixture()
def auth_service():
    return AuthService()


@pytest.fixture()
def test_audio_bytes():
    """Generate a 1-second silence WAV file as bytes (fast for tests)."""
    audio = AudioSegment.silent(duration=1000, frame_rate=44100)
    buf = io.BytesIO()
    audio.export(buf, format="wav")
    buf.seek(0)
    return buf.read()


def _create_test_app(db):
    """Create a FastAPI app with auth + exports routers wired to the in-memory db."""
    from fastapi import FastAPI

    from app.auth.router import _get_db, router as auth_router
    from app.exports.router import router as exports_router

    app = FastAPI()
    app.include_router(auth_router)
    app.include_router(exports_router)

    # Override the db dependency on auth router
    app.dependency_overrides[_get_db] = lambda: db
    return app


async def _register_and_login_async(client, email: str, password: str):
    """Register a user and login, return (user_id, token)."""
    resp = await client.post(
        "/auth/register",
        json={"email": email, "name": "Test", "password": password},
    )
    assert resp.status_code == 201
    user_id = resp.json()["id"]

    resp = await client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return user_id, token


# ---------------------------------------------------------------------------
# POST /exports
# ---------------------------------------------------------------------------


class TestCreateExport:
    @pytest.mark.anyio
    async def test_create_export_returns_202_with_job_id(self, db, test_audio_bytes):
        """POST /exports should return 202 with a job_id."""
        app = _create_test_app(db)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            user_id, token = await _register_and_login_async(
                client, "export@test.com", "pw123"
            )

            response = await client.post(
                "/exports",
                files={"audio": ("test.wav", test_audio_bytes, "audio/wav")},
                data={
                    "format": "mp4",
                    "duration": 1,
                    "style": "bars",
                    "aspect_ratio": "16:9",
                    "primary_color": "#FF5733",
                    "background_color": "#000000",
                },
                headers={"Authorization": f"Bearer {token}"},
            )

        assert response.status_code == 202
        data = response.json()
        assert "job_id" in data
        assert data["status"] == "pending"

    @pytest.mark.anyio
    async def test_create_export_without_auth_returns_401(self, test_audio_bytes):
        """POST /exports without a valid token should return 401."""
        conn = sqlite3.connect(":memory:", check_same_thread=False)
        conn.row_factory = sqlite3.Row
        init_db(conn)
        app = _create_test_app(conn)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/exports",
                files={"audio": ("test.wav", test_audio_bytes, "audio/wav")},
                data={
                    "format": "mp4",
                    "duration": 1,
                    "style": "bars",
                    "aspect_ratio": "16:9",
                },
            )

        assert response.status_code == 401

    @pytest.mark.anyio
    async def test_create_export_with_invalid_format_returns_422(
        self, db, test_audio_bytes
    ):
        """Invalid export format should be rejected before the job is created."""
        app = _create_test_app(db)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            _, token = await _register_and_login_async(
                client, "invalid-format@test.com", "pw123"
            )

            response = await client.post(
                "/exports",
                files={"audio": ("test.wav", test_audio_bytes, "audio/wav")},
                data={
                    "format": "avi",
                    "duration": 1,
                    "style": "bars",
                    "aspect_ratio": "16:9",
                },
                headers={"Authorization": f"Bearer {token}"},
            )

        assert response.status_code == 422

    @pytest.mark.anyio
    async def test_create_export_with_invalid_style_returns_422(
        self, db, test_audio_bytes
    ):
        """Invalid style should be rejected at the request boundary."""
        app = _create_test_app(db)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            _, token = await _register_and_login_async(
                client, "invalid-style@test.com", "pw123"
            )

            response = await client.post(
                "/exports",
                files={"audio": ("test.wav", test_audio_bytes, "audio/wav")},
                data={
                    "format": "mp4",
                    "duration": 1,
                    "style": "spiral",
                    "aspect_ratio": "16:9",
                },
                headers={"Authorization": f"Bearer {token}"},
            )

        assert response.status_code == 422

    @pytest.mark.anyio
    async def test_create_export_with_large_file_returns_413(self, db):
        """Oversized uploads should be rejected before saving to disk."""
        app = _create_test_app(db)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            _, token = await _register_and_login_async(
                client, "large-file@test.com", "pw123"
            )

            response = await client.post(
                "/exports",
                files={
                    "audio": ("big.wav", b"x" * (50 * 1024 * 1024 + 1), "audio/wav")
                },
                data={
                    "format": "mp4",
                    "duration": 1,
                    "style": "bars",
                    "aspect_ratio": "16:9",
                },
                headers={"Authorization": f"Bearer {token}"},
            )

        assert response.status_code == 413


# ---------------------------------------------------------------------------
# GET /exports/{job_id}/status
# ---------------------------------------------------------------------------


class TestJobStatus:
    @pytest.mark.anyio
    async def test_get_job_status_returns_job_data(self, db, test_audio_bytes):
        """GET /exports/{job_id}/status should return job details."""
        app = _create_test_app(db)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            user_id, token = await _register_and_login_async(
                client, "status@test.com", "pw123"
            )

            # Create a job first
            resp = await client.post(
                "/exports",
                files={"audio": ("test.wav", test_audio_bytes, "audio/wav")},
                data={
                    "format": "mp4",
                    "duration": 1,
                    "style": "bars",
                    "aspect_ratio": "16:9",
                },
                headers={"Authorization": f"Bearer {token}"},
            )
            job_id = resp.json()["job_id"]

            # Get status
            resp = await client.get(
                f"/exports/{job_id}/status",
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["job_id"] == job_id
        assert "status" in data
        assert "progress" in data

    @pytest.mark.anyio
    async def test_get_non_existent_job_status_returns_404(self, db):
        """GET /exports/{job_id}/status with unknown job_id should return 404."""
        app = _create_test_app(db)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            _, token = await _register_and_login_async(
                client, "notfound@test.com", "pw123"
            )
            resp = await client.get(
                "/exports/non-existent-job-id/status",
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 404

    @pytest.mark.anyio
    async def test_get_other_users_job_status_returns_403(self, db, test_audio_bytes):
        """A user should not be able to access another user's job status."""
        app = _create_test_app(db)

        # User A creates a job
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            _, token_a = await _register_and_login_async(
                client, "usera@test.com", "pw123"
            )
            resp = await client.post(
                "/exports",
                files={"audio": ("test.wav", test_audio_bytes, "audio/wav")},
                data={
                    "format": "mp4",
                    "duration": 1,
                    "style": "bars",
                    "aspect_ratio": "16:9",
                },
                headers={"Authorization": f"Bearer {token_a}"},
            )
            job_id = resp.json()["job_id"]

        # User B tries to access User A's job
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            _, token_b = await _register_and_login_async(
                client, "userb@test.com", "pw123"
            )
            resp = await client.get(
                f"/exports/{job_id}/status",
                headers={"Authorization": f"Bearer {token_b}"},
            )

        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# GET /exports/{job_id}/download
# ---------------------------------------------------------------------------


class TestJobDownload:
    @pytest.mark.anyio
    async def test_download_not_ready_returns_404(self, db, test_audio_bytes):
        """GET /exports/{job_id}/download should return 404 when job is not completed."""
        app = _create_test_app(db)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            user_id, token = await _register_and_login_async(
                client, "download@test.com", "pw123"
            )

            # Create a job
            resp = await client.post(
                "/exports",
                files={"audio": ("test.wav", test_audio_bytes, "audio/wav")},
                data={
                    "format": "mp4",
                    "duration": 1,
                    "style": "bars",
                    "aspect_ratio": "16:9",
                },
                headers={"Authorization": f"Bearer {token}"},
            )
            job_id = resp.json()["job_id"]

            # Try to download immediately (job is still pending/processing)
            resp = await client.get(
                f"/exports/{job_id}/download",
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 404

    @pytest.mark.anyio
    async def test_download_other_users_job_returns_403(self, db, test_audio_bytes):
        """A user should not be able to download another user's export."""
        app = _create_test_app(db)

        # User A creates a job
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            _, token_a = await _register_and_login_async(
                client, "downa@test.com", "pw123"
            )
            resp = await client.post(
                "/exports",
                files={"audio": ("test.wav", test_audio_bytes, "audio/wav")},
                data={
                    "format": "mp4",
                    "duration": 1,
                    "style": "bars",
                    "aspect_ratio": "16:9",
                },
                headers={"Authorization": f"Bearer {token_a}"},
            )
            job_id = resp.json()["job_id"]

        # User B tries to download
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            _, token_b = await _register_and_login_async(
                client, "downb@test.com", "pw123"
            )
            resp = await client.get(
                f"/exports/{job_id}/download",
                headers={"Authorization": f"Bearer {token_b}"},
            )

        assert resp.status_code == 403

    @pytest.mark.anyio
    async def test_download_without_auth_returns_401(self, db):
        """GET /exports/{job_id}/download without auth should return 401."""
        app = _create_test_app(db)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/exports/some-job-id/download")

        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Background processing test
# ---------------------------------------------------------------------------


class TestBackgroundProcessing:
    @pytest.mark.anyio
    async def test_pipeline_completes_for_small_audio(self, db, test_audio_bytes):
        """With a small audio file, the pipeline should complete within timeout."""
        from app.jobs.store import JobStore

        test_store = JobStore()

        app = _create_test_app(db)

        # Patch the job store and DB connection
        import app.jobs as jobs_module
        import app.exports.router as exports_router

        original_jobs_module_store = jobs_module.job_store
        original_router_store = exports_router.job_store
        original_db_getter = exports_router._db_getter
        jobs_module.job_store = test_store
        exports_router.job_store = test_store
        exports_router._db_getter = lambda: db

        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(
                transport=transport, base_url="http://test"
            ) as client:
                _, token = await _register_and_login_async(
                    client, "pipeline@test.com", "pw123"
                )

                resp = await client.post(
                    "/exports",
                    files={"audio": ("test.wav", test_audio_bytes, "audio/wav")},
                    data={
                        "format": "mp4",
                        "duration": 1,
                        "style": "bars",
                        "aspect_ratio": "16:9",
                        "primary_color": "#FF5733",
                        "background_color": "#000000",
                    },
                    headers={"Authorization": f"Bearer {token}"},
                )

            assert resp.status_code == 202
            job_id = resp.json()["job_id"]

            # Wait for background task to complete (poll with timeout)
            max_wait = 120  # seconds
            poll_interval = 1.0
            waited = 0
            while waited < max_wait:
                await asyncio.sleep(poll_interval)
                waited += poll_interval
                job = test_store.get(job_id)
                if job and job.status in ("completed", "failed"):
                    break

            job = test_store.get(job_id)
            assert job is not None, "Job should exist"
            assert job.status == "completed", f"Job failed: {job.error_message}"
            assert job.progress == 100
            assert job.output_file_path is not None
        finally:
            jobs_module.job_store = original_jobs_module_store
            exports_router.job_store = original_router_store
            exports_router._db_getter = original_db_getter
