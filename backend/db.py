import sqlite3
import os
from datetime import datetime, timezone
from typing import Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "app.db")


def get_conn() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            email       TEXT UNIQUE NOT NULL,
            password    TEXT NOT NULL,
            api_key     TEXT UNIQUE NOT NULL,
            stripe_customer_id TEXT,
            created_at  TEXT NOT NULL DEFAULT (datetime('now')),
            requests_today INTEGER DEFAULT 0,
            last_request_date TEXT
        );

        CREATE TABLE IF NOT EXISTS extractions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL REFERENCES users(id),
            filename    TEXT NOT NULL,
            result_json TEXT NOT NULL,
            created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_extractions_user ON extractions(user_id);
        CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
    """)
    conn.commit()
    conn.close()


def create_user(email: str, password_hash: str, api_key: str) -> int:
    conn = get_conn()
    try:
        cur = conn.execute(
            "INSERT INTO users (email, password, api_key) VALUES (?, ?, ?)",
            (email, password_hash, api_key),
        )
        conn.commit()
        return cur.lastrowid
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()


def get_user_by_email(email: str) -> Optional[sqlite3.Row]:
    conn = get_conn()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return row


def get_user_by_api_key(api_key: str) -> Optional[sqlite3.Row]:
    conn = get_conn()
    row = conn.execute("SELECT * FROM users WHERE api_key = ?", (api_key,)).fetchone()
    conn.close()
    return row


def get_user_by_id(user_id: int) -> Optional[sqlite3.Row]:
    conn = get_conn()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return row


def save_extraction(user_id: int, filename: str, result_json: str) -> int:
    conn = get_conn()
    cur = conn.execute(
        "INSERT INTO extractions (user_id, filename, result_json) VALUES (?, ?, ?)",
        (user_id, filename, result_json),
    )
    conn.commit()
    conn.close()
    return cur.lastrowid


def get_user_extractions(user_id: int, limit: int = 50) -> list:
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM extractions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
        (user_id, limit),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def check_rate_limit(api_key: str, max_per_day: int = 50) -> bool:
    """Returns True if under limit, False if over."""
    conn = get_conn()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    user = conn.execute(
        "SELECT requests_today, last_request_date FROM users WHERE api_key = ?",
        (api_key,),
    ).fetchone()

    if user is None:
        conn.close()
        return False

    if user["last_request_date"] != today:
        conn.execute(
            "UPDATE users SET requests_today = 0, last_request_date = ? WHERE api_key = ?",
            (today, api_key),
        )
        conn.commit()
        conn.close()
        return True

    under = user["requests_today"] < max_per_day
    conn.close()
    return under


def increment_request_count(api_key: str):
    conn = get_conn()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    conn.execute(
        """UPDATE users SET requests_today = requests_today + 1,
           last_request_date = ? WHERE api_key = ?""",
        (today, api_key),
    )
    conn.commit()
    conn.close()
