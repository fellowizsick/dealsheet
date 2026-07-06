import os, secrets, json
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import HTTPException, Header
from db import get_user_by_api_key, get_user_by_id

# JWT_SECRET — required from env. Fallback only for local dev.
JWT_SECRET_FILE = os.path.join(os.path.dirname(__file__), ".jwt_secret")
SECRET_KEY = os.environ.get("JWT_SECRET")
if not SECRET_KEY:
    if os.path.exists(JWT_SECRET_FILE):
        SECRET_KEY = open(JWT_SECRET_FILE).read().strip()
    else:
        SECRET_KEY = secrets.token_hex(32)
        with open(JWT_SECRET_FILE, "w") as f:
            f.write(SECRET_KEY)
ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 30


def hash_password(password: str) -> str:
    """bcrypt hash with auto-generated salt (12 rounds)."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(password: str, stored: str) -> bool:
    """Verify password against bcrypt hash. Also accepts legacy SHA-256:salt format."""
    # Legacy SHA-256 format
    if ":" in stored and len(stored) > 40:
        salt, pwd_hash = stored.split(":", 1)
        if len(salt) == 16 and len(pwd_hash) == 64:
            import hashlib
            return pwd_hash == hashlib.sha256((salt + password).encode()).hexdigest()
    # Modern bcrypt format
    try:
        return bcrypt.checkpw(password.encode(), stored.encode())
    except Exception:
        return False


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
    """Extract and verify user from Authorization: Bearer token or x-api-key."""
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
