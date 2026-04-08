"""Tests for the in-memory job store."""

import time
import uuid

from app.jobs import job_store


class TestJobStoreCreate:
    def test_create_generates_uuid4_id(self):
        job = job_store.create(
            user_id="u1", format="mp4", duration=30, style="bars", aspect_ratio="16:9"
        )
        # uuid4 should parse without raising
        parsed = uuid.UUID(job.id, version=4)
        assert str(parsed) == job.id

    def test_create_defaults_to_pending_status(self):
        job = job_store.create(
            user_id="u1", format="mp4", duration=30, style="bars", aspect_ratio="16:9"
        )
        assert job.status == "pending"

    def test_create_defaults_to_zero_progress(self):
        job = job_store.create(
            user_id="u1", format="mp4", duration=30, style="bars", aspect_ratio="16:9"
        )
        assert job.progress == 0.0

    def test_create_stores_provided_fields(self):
        job = job_store.create(
            user_id="u1", format="gif", duration=10, style="line", aspect_ratio="9:16"
        )
        assert job.user_id == "u1"
        assert job.format == "gif"
        assert job.duration == 10
        assert job.style == "line"
        assert job.aspect_ratio == "9:16"


class TestJobStoreGet:
    def test_get_returns_existing_job(self):
        created = job_store.create(
            user_id="u1", format="mp4", duration=30, style="bars", aspect_ratio="16:9"
        )
        fetched = job_store.get(created.id)
        assert fetched is not None
        assert fetched.id == created.id
        assert fetched.user_id == "u1"

    def test_get_returns_none_for_non_existent_job(self):
        result = job_store.get("non-existent-id")
        assert result is None


class TestJobStoreUpdate:
    def test_update_changes_status(self):
        job = job_store.create(
            user_id="u1", format="mp4", duration=30, style="bars", aspect_ratio="16:9"
        )
        updated = job_store.update(job.id, status="processing")
        assert updated is not None
        assert updated.status == "processing"

    def test_update_changes_progress(self):
        job = job_store.create(
            user_id="u1", format="mp4", duration=30, style="bars", aspect_ratio="16:9"
        )
        updated = job_store.update(job.id, progress=50.0)
        assert updated is not None
        assert updated.progress == 50.0

    def test_update_changes_error_message(self):
        job = job_store.create(
            user_id="u1", format="mp4", duration=30, style="bars", aspect_ratio="16:9"
        )
        updated = job_store.update(job.id, error_message="render failed")
        assert updated is not None
        assert updated.error_message == "render failed"

    def test_update_changes_file_paths(self):
        job = job_store.create(
            user_id="u1", format="mp4", duration=30, style="bars", aspect_ratio="16:9"
        )
        updated = job_store.update(
            job.id, audio_file_path="/tmp/input.wav", output_file_path="/tmp/output.mp4"
        )
        assert updated is not None
        assert updated.audio_file_path == "/tmp/input.wav"
        assert updated.output_file_path == "/tmp/output.mp4"

    def test_update_updates_timestamp(self):
        job = job_store.create(
            user_id="u1", format="mp4", duration=30, style="bars", aspect_ratio="16:9"
        )
        original_updated_at = job.updated_at
        time.sleep(0.01)  # ensure clock advances
        updated = job_store.update(job.id, status="completed")
        assert updated is not None
        assert updated.updated_at > original_updated_at

    def test_update_returns_none_for_non_existent_job(self):
        result = job_store.update("non-existent-id", status="completed")
        assert result is None


class TestJobStoreDelete:
    def test_delete_removes_job(self):
        job = job_store.create(
            user_id="u1", format="mp4", duration=30, style="bars", aspect_ratio="16:9"
        )
        result = job_store.delete(job.id)
        assert result is True
        assert job_store.get(job.id) is None

    def test_delete_returns_false_for_non_existent_job(self):
        result = job_store.delete("non-existent-id")
        assert result is False


class TestJobStoreListByUser:
    def test_list_returns_only_that_users_jobs(self):
        job_u1 = job_store.create(
            user_id="user_a",
            format="mp4",
            duration=30,
            style="bars",
            aspect_ratio="16:9",
        )
        job_u2 = job_store.create(
            user_id="user_b",
            format="gif",
            duration=10,
            style="line",
            aspect_ratio="1:1",
        )

        jobs_a = job_store.list_by_user("user_a")
        ids_a = {j.id for j in jobs_a}
        assert job_u1.id in ids_a
        assert job_u2.id not in ids_a

    def test_list_sorted_by_created_at_desc(self):
        job1 = job_store.create(
            user_id="u1", format="mp4", duration=30, style="bars", aspect_ratio="16:9"
        )
        time.sleep(0.01)
        job2 = job_store.create(
            user_id="u1", format="gif", duration=10, style="line", aspect_ratio="1:1"
        )

        jobs = job_store.list_by_user("u1")
        assert jobs[0].id == job2.id
        assert jobs[1].id == job1.id

    def test_list_empty_for_unknown_user(self):
        jobs = job_store.list_by_user("unknown")
        assert jobs == []


class TestJobIsolation:
    def test_users_do_not_see_each_others_jobs(self):
        job_store.create(
            user_id="isolated_u1",
            format="mp4",
            duration=30,
            style="bars",
            aspect_ratio="16:9",
        )
        job_store.create(
            user_id="isolated_u1",
            format="mp4",
            duration=30,
            style="bars",
            aspect_ratio="16:9",
        )
        job_store.create(
            user_id="isolated_u2",
            format="gif",
            duration=10,
            style="mirror",
            aspect_ratio="9:16",
        )

        u1_jobs = job_store.list_by_user("isolated_u1")
        u2_jobs = job_store.list_by_user("isolated_u2")

        assert len(u1_jobs) == 2
        assert len(u2_jobs) == 1
        assert all(j.user_id == "isolated_u1" for j in u1_jobs)
        assert all(j.user_id == "isolated_u2" for j in u2_jobs)
