import time
from datetime import timedelta

import pytest

from app.auth.service import AuthService


@pytest.fixture
def auth_service():
    """Create an AuthService instance for testing."""
    return AuthService()


class TestHashPassword:
    def test_hash_password_produces_a_hash(self, auth_service: AuthService):
        """hash_password should return a non-empty string different from the input."""
        hashed = auth_service.hash_password("my_secret_password")
        assert isinstance(hashed, str)
        assert len(hashed) > 0
        assert hashed != "my_secret_password"

    def test_hash_password_produces_different_hashes_for_same_password(
        self, auth_service: AuthService
    ):
        """Each call should produce a unique hash due to bcrypt salt."""
        h1 = auth_service.hash_password("same_password")
        h2 = auth_service.hash_password("same_password")
        assert h1 != h2


class TestVerifyPassword:
    def test_verify_password_returns_true_for_correct_password(
        self, auth_service: AuthService
    ):
        hashed = auth_service.hash_password("correct_password")
        assert auth_service.verify_password("correct_password", hashed) is True

    def test_verify_password_returns_false_for_wrong_password(
        self, auth_service: AuthService
    ):
        hashed = auth_service.hash_password("correct_password")
        assert auth_service.verify_password("wrong_password", hashed) is False


class TestCreateAccessToken:
    def test_create_access_token_returns_valid_jwt_string(
        self, auth_service: AuthService
    ):
        token = auth_service.create_access_token(data={"sub": "user_123"})
        assert isinstance(token, str)
        assert len(token) > 0
        # JWT tokens contain three dot-separated parts
        assert token.count(".") == 2

    def test_create_access_token_includes_sub_and_exp(self, auth_service: AuthService):
        """Token payload should contain 'sub' and 'exp' claims."""
        token = auth_service.create_access_token(data={"sub": "user_456"})
        payload = auth_service.decode_access_token(token)
        assert payload is not None
        assert payload["sub"] == "user_456"
        assert "exp" in payload

    def test_create_access_token_includes_extra_data(self, auth_service: AuthService):
        """Extra data passed in should be present in the token."""
        token = auth_service.create_access_token(
            data={"sub": "user_789", "role": "admin"},
        )
        payload = auth_service.decode_access_token(token)
        assert payload is not None
        assert payload["role"] == "admin"

    def test_create_access_token_custom_expiry(self, auth_service: AuthService):
        """When expires_delta is provided, it should override the default."""
        token = auth_service.create_access_token(
            data={"sub": "user_1"},
            expires_delta=timedelta(hours=2),
        )
        payload = auth_service.decode_access_token(token)
        assert payload is not None
        # The exp should be roughly now + 2 hours (allow 10s tolerance)
        assert payload["exp"] - int(time.time()) == pytest.approx(7200, abs=10)


class TestDecodeAccessToken:
    def test_decode_returns_original_data(self, auth_service: AuthService):
        """A valid token should decode back to the original payload."""
        original = {"sub": "user_test", "name": "Alice"}
        token = auth_service.create_access_token(data=original)
        payload = auth_service.decode_access_token(token)
        assert payload is not None
        assert payload["sub"] == "user_test"
        assert payload["name"] == "Alice"

    def test_decode_returns_none_for_invalid_token(self, auth_service: AuthService):
        """A malformed or tampered token should return None."""
        assert auth_service.decode_access_token("not.a.valid.token") is None
        assert auth_service.decode_access_token("garbage") is None

    def test_decode_returns_none_for_tampered_token(self, auth_service: AuthService):
        """A token signed with a different secret should fail verification."""
        token = auth_service.create_access_token(data={"sub": "user_1"})
        # Tamper: change one character
        tampered = token[:-1] + ("0" if token[-1] != "0" else "1")
        assert auth_service.decode_access_token(tampered) is None

    def test_decode_returns_none_for_expired_token(self, auth_service: AuthService):
        """A token with very short expiry should return None after it expires."""
        token = auth_service.create_access_token(
            data={"sub": "user_expired"},
            expires_delta=timedelta(seconds=1),
        )
        time.sleep(2)
        assert auth_service.decode_access_token(token) is None
