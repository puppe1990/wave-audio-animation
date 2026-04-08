"""Integration tests for the auth router (register + login)."""

import sqlite3
import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.auth.service import AuthService
from app.db.connection import init_db


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def db():
    """Provide an in-memory database connection with tables initialized.

    ``check_same_thread=False`` is required because the connection is
    created in the pytest thread but used by the async event loop thread
    during httpx requests.
    """
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
def test_app(db):
    """Create a FastAPI app with the auth router wired to the in-memory db."""
    from fastapi import FastAPI

    from app.auth.router import _get_db, router as auth_router

    app = FastAPI()
    app.include_router(auth_router)

    # Override the db dependency on the router
    app.dependency_overrides[_get_db] = lambda: db
    return app


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _insert_user(db, user_id: str, email: str, name: str, password_hash: str) -> None:
    now = 1_000_000_000
    db.execute(
        "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
        (user_id, email, name, password_hash, now),
    )
    db.commit()


# ---------------------------------------------------------------------------
# POST /auth/register
# ---------------------------------------------------------------------------

class TestRegister:
    @pytest.mark.anyio
    async def test_register_creates_user_returns_201(self, test_app, db):
        """POST /auth/register with valid data should create a user and return 201."""
        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/auth/register",
                json={"email": "new@example.com", "name": "New User", "password": "secret123"},
            )

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "new@example.com"
        assert data["name"] == "New User"
        assert "id" in data
        assert "created_at" in data

    @pytest.mark.anyio
    async def test_register_without_name_returns_201(self, test_app, db):
        """Name is optional -- registration should still succeed."""
        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/auth/register",
                json={"email": "noname@example.com", "password": "secret"},
            )

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "noname@example.com"

    @pytest.mark.anyio
    async def test_register_duplicate_email_returns_409(self, test_app, db, auth_service):
        """Registering with an email that already exists should return 409."""
        user_id = str(uuid.uuid4())
        hashed = auth_service.hash_password("existing_pw")
        _insert_user(db, user_id, "existing@example.com", "Existing", hashed)

        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/auth/register",
                json={"email": "existing@example.com", "name": "Dup", "password": "pw"},
            )

        assert response.status_code == 409

    @pytest.mark.anyio
    async def test_register_missing_fields_returns_422(self, test_app):
        """Missing required fields should return 422 validation error."""
        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/auth/register",
                json={"email": "missing@example.com"},  # missing password
            )

        assert response.status_code == 422


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------

class TestLogin:
    @pytest.mark.anyio
    async def test_login_with_correct_credentials_returns_token(self, test_app, db, auth_service):
        """POST /auth/login with valid email+password should return a JWT."""
        user_id = str(uuid.uuid4())
        hashed = auth_service.hash_password("mypassword")
        _insert_user(db, user_id, "login@example.com", "Login User", hashed)

        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/auth/login",
                json={"email": "login@example.com", "password": "mypassword"},
            )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

        # Verify the token is valid and contains the right user id
        payload = auth_service.decode_access_token(data["access_token"])
        assert payload is not None
        assert payload["sub"] == user_id

    @pytest.mark.anyio
    async def test_login_with_wrong_password_returns_401(self, test_app, db, auth_service):
        """Wrong password should return 401."""
        user_id = str(uuid.uuid4())
        hashed = auth_service.hash_password("correct_password")
        _insert_user(db, user_id, "user@example.com", "User", hashed)

        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/auth/login",
                json={"email": "user@example.com", "password": "wrong_password"},
            )

        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid credentials"

    @pytest.mark.anyio
    async def test_login_with_nonexistent_email_returns_404(self, test_app):
        """Email that doesn't exist in the database should return the same auth error."""
        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/auth/login",
                json={"email": "nobody@example.com", "password": "whatever"},
            )

        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid credentials"

    @pytest.mark.anyio
    async def test_login_missing_fields_returns_422(self, test_app):
        """Missing required fields should return 422."""
        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/auth/login",
                json={"email": "test@example.com"},  # missing password
            )

        assert response.status_code == 422


# ---------------------------------------------------------------------------
# Auth dependency (protected endpoint)
# ---------------------------------------------------------------------------

class TestAuthDependency:
    @pytest.mark.anyio
    async def test_access_protected_endpoint_without_auth_returns_401(self):
        """A route protected by get_current_user should return 401 when no token is provided."""
        from fastapi import Depends, FastAPI

        from app.auth.dependencies import get_current_user
        from app.auth.router import router as auth_router

        app = FastAPI()
        app.include_router(auth_router)

        @app.get("/protected")
        def protected(user_id: str = Depends(get_current_user)):
            return {"user_id": user_id}

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/protected")

        assert response.status_code == 401

    @pytest.mark.anyio
    async def test_access_protected_endpoint_with_valid_token_returns_200(self, db, auth_service):
        """A valid Bearer token should allow access to a protected endpoint."""
        from fastapi import Depends, FastAPI

        from app.auth.dependencies import get_current_user
        from app.auth.router import _get_db, router as auth_router

        app = FastAPI()
        app.include_router(auth_router)

        @app.get("/protected")
        def protected(user_id: str = Depends(get_current_user)):
            return {"user_id": user_id}

        # Override the db dependency
        app.dependency_overrides[_get_db] = lambda: db

        # Create a user and token
        user_id = str(uuid.uuid4())
        hashed = auth_service.hash_password("pw")
        _insert_user(db, user_id, "token@example.com", "Token User", hashed)
        token = auth_service.create_access_token(data={"sub": user_id})

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/protected",
                headers={"Authorization": f"Bearer {token}"},
            )

        assert response.status_code == 200
        assert response.json()["user_id"] == user_id
