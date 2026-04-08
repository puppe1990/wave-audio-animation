"""Database connection module using libsql (Turso) with sqlite3 fallback."""

import os
import sqlite3
from pathlib import Path

# Try to import libsql_experimental; fall back to sqlite3 if unavailable.
try:
    import libsql_experimental as libsql

    _HAS_LIBSQL = True
except ImportError:
    _HAS_LIBSQL = False

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

TURSO_DATABASE_URL = os.environ.get("TURSO_DATABASE_URL")
TURSO_AUTH_TOKEN = os.environ.get("TURSO_AUTH_TOKEN")

# Local dev database path
_BACKEND_DIR = Path(__file__).resolve().parents[2]
_DATA_DIR = _BACKEND_DIR / "data"
_DATA_DIR.mkdir(parents=True, exist_ok=True)
LOCAL_DB_PATH = str(_DATA_DIR / "dev.db")


def _is_turso_configured() -> bool:
    """Return True when both Turso URL and token are set."""
    return bool(TURSO_DATABASE_URL and TURSO_AUTH_TOKEN)


# ---------------------------------------------------------------------------
# Connection
# ---------------------------------------------------------------------------


def get_connection(database: str | None = None) -> sqlite3.Connection:
    """Return a database connection.

    Priority:
    1. If *database* is provided, use it directly (supports ``:memory:`` for tests).
    2. If TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set, connect to Turso.
    3. Fall back to a local SQLite file at ``backend/data/dev.db``.
    """
    if database is not None:
        if _HAS_LIBSQL and database.startswith(("libsql://", "http://", "https://")):
            conn = libsql.connect(database, auth_token=TURSO_AUTH_TOKEN)
        else:
            conn = sqlite3.connect(database)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    if _is_turso_configured() and _HAS_LIBSQL:
        conn = libsql.connect(TURSO_DATABASE_URL, auth_token=TURSO_AUTH_TOKEN)  # type: ignore[arg-type]
        conn.row_factory = sqlite3.Row  # type: ignore[assignment]
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    # Local SQLite fallback
    conn = sqlite3.connect(LOCAL_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


# ---------------------------------------------------------------------------
# Schema initialization
# ---------------------------------------------------------------------------

_CREATE_USERS = """
CREATE TABLE IF NOT EXISTS users (
    id              TEXT    PRIMARY KEY,
    email           TEXT    NOT NULL UNIQUE,
    name            TEXT,
    password_hash   TEXT,
    created_at      INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
"""

_CREATE_EXPORTS = """
CREATE TABLE IF NOT EXISTS exports (
    id              TEXT    PRIMARY KEY,
    user_id         TEXT    NOT NULL REFERENCES users(id),
    format          TEXT    NOT NULL CHECK(format IN ('mp4', 'gif')),
    duration        INTEGER NOT NULL,
    style           TEXT    NOT NULL CHECK(style IN ('bars', 'line', 'mirror')),
    aspect_ratio    TEXT    NOT NULL CHECK(aspect_ratio IN ('16:9', '9:16', '1:1')),
    created_at      INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
"""

CREATE_INDEXES = """
CREATE INDEX IF NOT EXISTS idx_exports_user_id ON exports(user_id);
"""


def init_db(conn: sqlite3.Connection | None = None) -> sqlite3.Connection:
    """Create the ``users`` and ``exports`` tables if they do not exist.

    Returns the connection that was used (or a newly opened one).
    """
    own_conn = conn is None
    if conn is None:
        conn = get_connection()

    try:
        conn.execute(_CREATE_USERS)
        conn.execute(_CREATE_EXPORTS)
        conn.execute(CREATE_INDEXES)
        conn.commit()
    finally:
        if own_conn:
            conn.close()

    return conn
