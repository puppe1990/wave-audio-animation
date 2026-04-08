import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

logger = logging.getLogger(__name__)

# Default secret key for development -- NEVER use this in production.
_DEFAULT_SECRET_KEY = "dev-secret-key-do-not-use-in-production"

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """Handles password hashing/verification and JWT token creation/validation."""

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    def __init__(self) -> None:
        self.SECRET_KEY = os.getenv("AUTH_SECRET_KEY")
        if not self.SECRET_KEY:
            logger.warning(
                "AUTH_SECRET_KEY is not set -- using default development key. "
                "This is INSECURE for production. Set AUTH_SECRET_KEY in your environment.",
            )
            self.SECRET_KEY = _DEFAULT_SECRET_KEY

    # ------------------------------------------------------------------
    # Password hashing
    # ------------------------------------------------------------------

    def hash_password(self, password: str) -> str:
        """Hash a password using bcrypt."""
        return _pwd_context.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its bcrypt hash."""
        return _pwd_context.verify(plain_password, hashed_password)

    # ------------------------------------------------------------------
    # JWT tokens
    # ------------------------------------------------------------------

    def create_access_token(
        self,
        data: dict[str, Any],
        expires_delta: timedelta | None = None,
    ) -> str:
        """Create a JWT token containing *data* plus an ``exp`` claim.

        The caller should provide ``sub`` (user ID) inside *data*.
        If *expires_delta* is None the class-level default is used.
        """
        to_encode = data.copy()

        if expires_delta is not None:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(
                minutes=self.ACCESS_TOKEN_EXPIRE_MINUTES,
            )

        to_encode["exp"] = expire
        return jwt.encode(to_encode, self.SECRET_KEY, algorithm=self.ALGORITHM)

    def decode_access_token(self, token: str) -> dict[str, Any] | None:
        """Decode and verify a JWT token.

        Returns the payload dict or ``None`` if the token is invalid,
        expired, or signed with the wrong key.
        """
        try:
            payload = jwt.decode(
                token,
                self.SECRET_KEY,
                algorithms=[self.ALGORITHM],
            )
            return payload
        except JWTError:
            return None
