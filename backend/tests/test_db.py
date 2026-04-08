"""Tests for the database layer (connection, init, CRUD)."""

import sqlite3
import uuid
from datetime import datetime, timezone

import pytest

from app.db.connection import get_connection, init_db
from app.db.models import Export, ExportCreate, User, UserCreate


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def db():
    """Provide an in-memory database connection with tables initialized."""
    conn = get_connection(database=":memory:")
    init_db(conn)
    yield conn
    conn.close()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _row_to_dict(row: sqlite3.Row) -> dict:
    return dict(row)


# ---------------------------------------------------------------------------
# init_db tests
# ---------------------------------------------------------------------------

class TestInitDb:
    def test_init_db_creates_users_table(self, db):
        result = db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
        ).fetchone()
        assert result is not None

    def test_init_db_creates_exports_table(self, db):
        result = db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='exports'"
        ).fetchone()
        assert result is not None

    def test_init_db_is_idempotent(self, db):
        """Calling init_db twice should not raise."""
        init_db(db)
        init_db(db)


# ---------------------------------------------------------------------------
# User tests
# ---------------------------------------------------------------------------

class TestUserCrud:
    def test_insert_and_read_user(self, db):
        user_id = str(uuid.uuid4())
        now = int(datetime.now(timezone.utc).timestamp())

        db.execute(
            "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, "alice@example.com", "Alice", "hashed_pw", now),
        )
        db.commit()

        row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        assert row is not None
        data = _row_to_dict(row)
        assert data["id"] == user_id
        assert data["email"] == "alice@example.com"
        assert data["name"] == "Alice"
        assert data["password_hash"] == "hashed_pw"

    def test_user_model_roundtrip(self, db):
        """Insert via raw SQL, read back and validate against the User Pydantic model."""
        user_id = str(uuid.uuid4())
        now = int(datetime.now(timezone.utc).timestamp())

        db.execute(
            "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, "bob@example.com", "Bob", "hash123", now),
        )
        db.commit()

        row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        user = User(
            id=row["id"],
            email=row["email"],
            name=row["name"],
            password_hash=row["password_hash"],
            created_at=datetime.fromtimestamp(row["created_at"], tz=timezone.utc),
        )
        assert user.id == user_id
        assert user.email == "bob@example.com"

    def test_user_email_unique_constraint(self, db):
        user_id_1 = str(uuid.uuid4())
        user_id_2 = str(uuid.uuid4())
        now = int(datetime.now(timezone.utc).timestamp())

        db.execute(
            "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id_1, "unique@example.com", "First", "h1", now),
        )
        db.commit()

        with pytest.raises(sqlite3.IntegrityError):
            db.execute(
                "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
                (user_id_2, "unique@example.com", "Second", "h2", now),
            )
            db.commit()

    def test_user_create_model_validates(self):
        """UserCreate should accept valid data and reject missing fields."""
        uc = UserCreate(email="test@example.com", name="Test", password="secret")
        assert uc.email == "test@example.com"
        assert uc.password == "secret"

        # Missing required 'password' should raise a validation error
        with pytest.raises(Exception):  # pydantic.ValidationError
            UserCreate(email="test@example.com", name="Test")


# ---------------------------------------------------------------------------
# Export tests
# ---------------------------------------------------------------------------

class TestExportCrud:
    def _create_user(self, db, user_id: str | None = None) -> str:
        user_id = user_id or str(uuid.uuid4())
        now = int(datetime.now(timezone.utc).timestamp())
        db.execute(
            "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, f"{user_id}@test.com", "TestUser", "hash", now),
        )
        db.commit()
        return user_id

    def test_insert_and_read_export(self, db):
        user_id = self._create_user(db)
        export_id = str(uuid.uuid4())
        now = int(datetime.now(timezone.utc).timestamp())

        db.execute(
            "INSERT INTO exports (id, user_id, format, duration, style, aspect_ratio, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (export_id, user_id, "mp4", 30, "bars", "16:9", now),
        )
        db.commit()

        row = db.execute("SELECT * FROM exports WHERE id = ?", (export_id,)).fetchone()
        assert row is not None
        data = _row_to_dict(row)
        assert data["id"] == export_id
        assert data["user_id"] == user_id
        assert data["format"] == "mp4"
        assert data["duration"] == 30
        assert data["style"] == "bars"
        assert data["aspect_ratio"] == "16:9"

    def test_export_model_roundtrip(self, db):
        user_id = self._create_user(db)
        export_id = str(uuid.uuid4())
        now = int(datetime.now(timezone.utc).timestamp())

        db.execute(
            "INSERT INTO exports (id, user_id, format, duration, style, aspect_ratio, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (export_id, user_id, "gif", 10, "line", "9:16", now),
        )
        db.commit()

        row = db.execute("SELECT * FROM exports WHERE id = ?", (export_id,)).fetchone()
        export = Export(
            id=row["id"],
            user_id=row["user_id"],
            format=row["format"],
            duration=row["duration"],
            style=row["style"],
            aspect_ratio=row["aspect_ratio"],
            created_at=datetime.fromtimestamp(row["created_at"], tz=timezone.utc),
        )
        assert export.id == export_id
        assert export.format == "gif"
        assert export.style == "line"
        assert export.aspect_ratio == "9:16"

    def test_export_fk_constraint(self, db):
        """Inserting an export with a non-existent user_id should fail."""
        export_id = str(uuid.uuid4())
        now = int(datetime.now(timezone.utc).timestamp())

        with pytest.raises(sqlite3.IntegrityError):
            db.execute(
                "INSERT INTO exports (id, user_id, format, duration, style, aspect_ratio, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (export_id, "nonexistent-user", "mp4", 30, "bars", "16:9", now),
            )
            db.commit()

    def test_export_format_check_constraint(self, db):
        user_id = self._create_user(db)
        export_id = str(uuid.uuid4())
        now = int(datetime.now(timezone.utc).timestamp())

        with pytest.raises(sqlite3.IntegrityError):
            db.execute(
                "INSERT INTO exports (id, user_id, format, duration, style, aspect_ratio, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (export_id, user_id, "avi", 30, "bars", "16:9", now),  # invalid format
            )
            db.commit()

    def test_export_style_check_constraint(self, db):
        user_id = self._create_user(db)
        export_id = str(uuid.uuid4())
        now = int(datetime.now(timezone.utc).timestamp())

        with pytest.raises(sqlite3.IntegrityError):
            db.execute(
                "INSERT INTO exports (id, user_id, format, duration, style, aspect_ratio, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (export_id, user_id, "mp4", 30, "waveform", "16:9", now),  # invalid style
            )
            db.commit()

    def test_export_aspect_ratio_check_constraint(self, db):
        user_id = self._create_user(db)
        export_id = str(uuid.uuid4())
        now = int(datetime.now(timezone.utc).timestamp())

        with pytest.raises(sqlite3.IntegrityError):
            db.execute(
                "INSERT INTO exports (id, user_id, format, duration, style, aspect_ratio, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (export_id, user_id, "mp4", 30, "bars", "4:3", now),  # invalid aspect ratio
            )
            db.commit()

    def test_export_create_model_validates(self):
        ec = ExportCreate(
            user_id=str(uuid.uuid4()),
            format="mp4",
            duration=60,
            style="mirror",
            aspect_ratio="1:1",
        )
        assert ec.format == "mp4"
        assert ec.style == "mirror"
        assert ec.aspect_ratio == "1:1"

        with pytest.raises(Exception):  # pydantic.ValidationError
            ExportCreate(user_id=str(uuid.uuid4()), format="webm", duration=10, style="bars", aspect_ratio="16:9")
