import os
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import HTTPException, Header
from db import get_user_by_api_key, get_user_by_id

SECRET_KEY = os.environ.get("JWT_SECRET", secrets.token_hex(32))
ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 30


def hash_password(password: str) -> str:
    """Simple salted SHA-256 hash. For production, use bcrypt."""
    salt = hashlib.sha256(secrets.token_bytes(32)).hexdigest()[:16]
    return f"{salt}:{hashlib.sha256((salt + password).encode()).hexdigest()}"


def verify_password(password: str, stored: str) -> bool:
    salt, pwd_hash = stored.split(":", 1)
    return pwd_hash == hashlib.sha256((salt + password).encode()).hexdigest()


def generate_api_key() -> str:
    return "rea_" + secrets.token_hex(24)


def create_token(user_id: int) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(authorization: str = Header(None)) -> dict:
    """Extract and verify user from Authorization: Bearer <token> or x-api-key."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization")

    # Try API key first
    if authorization.startswith("rea_"):
        user = get_user_by_api_key(authorization)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid API key")
        return dict(user)

    # Try Bearer token
    if authorization.startswith("Bearer "):
        token = authorization[7:]
        payload = verify_token(token)
        user = get_user_by_id(payload["user_id"])
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return dict(user)

    raise HTTPException(status_code=401, detail="Invalid authorization format")
