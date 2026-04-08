"""FastAPI dependency for extracting and validating the current authenticated user."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.auth.service import AuthService

_security = HTTPBearer()
_auth_service = AuthService()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> str:
    """Extract and verify the JWT from the Authorization header.

    Returns the user ID (the ``sub`` claim).
    Raises ``HTTPException 401`` when the token is missing, expired, or invalid.
    """
    payload = _auth_service.decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user_id
