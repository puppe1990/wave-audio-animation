"""Auth router: POST /auth/register and POST /auth/login."""

import sqlite3
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel

from app.auth.service import AuthService
from app.db.connection import get_connection

router = APIRouter(prefix="/auth", tags=["auth"])
_auth_service = AuthService()


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: str
    name: str | None = None
    password: str


class RegisterResponse(BaseModel):
    id: str
    email: str
    name: str | None
    created_at: int


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------------------------------------------------------------------------
# DB dependency (can be overridden in tests)
# ---------------------------------------------------------------------------

def _get_db() -> sqlite3.Connection:
    """Return a database connection. Override in tests via app.dependency_overrides."""
    return get_connection()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        409: {"description": "Email already registered"},
    },
)
async def register(
    body: RegisterRequest,
    response: Response,
    db: sqlite3.Connection = Depends(_get_db),
) -> RegisterResponse:
    """Create a new user account.

    Returns the created user record (no token -- call /login to get one).
    """
    existing = db.execute(
        "SELECT id FROM users WHERE email = ?",
        (body.email,),
    ).fetchone()

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user_id = str(uuid.uuid4())
    password_hash = _auth_service.hash_password(body.password)
    now = int(datetime.now(timezone.utc).timestamp())

    db.execute(
        "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
        (user_id, body.email, body.name, password_hash, now),
    )
    db.commit()

    return RegisterResponse(
        id=user_id,
        email=body.email,
        name=body.name,
        created_at=now,
    )


@router.post(
    "/login",
    response_model=LoginResponse,
    responses={
        404: {"description": "User not found"},
        401: {"description": "Invalid credentials"},
    },
)
async def login(
    body: LoginRequest,
    db: sqlite3.Connection = Depends(_get_db),
) -> LoginResponse:
    """Authenticate with email + password and receive a JWT access token."""
    row = db.execute(
        "SELECT id, email, password_hash FROM users WHERE email = ?",
        (body.email,),
    ).fetchone()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not _auth_service.verify_password(body.password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = _auth_service.create_access_token(data={"sub": row["id"]})
    return LoginResponse(access_token=access_token)
