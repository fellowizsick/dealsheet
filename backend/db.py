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
            status      TEXT NOT NULL DEFAULT 'active',
            tags        TEXT DEFAULT '',
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


def migrate_user_schema():
    """Add subscription columns if they don't exist yet."""
    conn = get_conn()
    for col in ["subscription_status", "subscription_ends_at"]:
        try:
            conn.execute(f"ALTER TABLE users ADD COLUMN {col} TEXT DEFAULT NULL")
            conn.commit()
        except sqlite3.OperationalError:
            pass  # already exists
    conn.close()


def set_subscription(user_id: int, status: str, ends_at: str = None):
    """status: 'active', 'canceled', 'past_due', or None for free."""
    conn = get_conn()
    migrate_user_schema()
    conn.execute(
        "UPDATE users SET subscription_status = ?, subscription_ends_at = ? WHERE id = ?",
        (status, ends_at, user_id),
    )
    conn.commit()
    conn.close()


def get_subscription(user_id: int) -> dict:
    conn = get_conn()
    migrate_user_schema()
    row = conn.execute(
        "SELECT subscription_status, subscription_ends_at FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    conn.close()
    if row and row["subscription_status"]:
        return {"status": row["subscription_status"], "ends_at": row["subscription_ends_at"]}
    return {"status": None, "ends_at": None}


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


def update_extraction_status(extraction_id: int, user_id: int, status: str) -> bool:
    conn = get_conn()
    cur = conn.execute(
        "UPDATE extractions SET status = ? WHERE id = ? AND user_id = ?",
        (status, extraction_id, user_id),
    )
    conn.commit()
    ok = cur.rowcount > 0
    conn.close()
    return ok


def update_extraction_tags(extraction_id: int, user_id: int, tags: str) -> bool:
    conn = get_conn()
    cur = conn.execute(
        "UPDATE extractions SET tags = ? WHERE id = ? AND user_id = ?",
        (tags, extraction_id, user_id),
    )
    conn.commit()
    ok = cur.rowcount > 0
    conn.close()
    return ok


def get_pipeline_stats(user_id: int) -> dict:
    conn = get_conn()
    rows = conn.execute(
        "SELECT status, COUNT(*) as count FROM extractions WHERE user_id = ? GROUP BY status",
        (user_id,),
    ).fetchall()
    conn.close()
    stats = {r["status"]: r["count"] for r in rows}
    return {
        "active": stats.get("active", 0),
        "under_contract": stats.get("under_contract", 0),
        "closed": stats.get("closed", 0),
        "archived": stats.get("archived", 0),
        "total": sum(stats.values()),
    }


def save_manual_deal(user_id: int, filename: str, result_json: str, status: str, tags: str):
    conn = get_conn()
    conn.execute(
        "INSERT INTO extractions (user_id, filename, result_json, status, tags) VALUES (?, ?, ?, ?, ?)",
        (user_id, filename, result_json, status, tags),
    )
    conn.commit()
    conn.close()


def check_rate_limit(api_key: str, max_per_day: int = 50) -> bool:
    """Returns True if under limit, False if over. Uses UTC day boundaries."""
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


# ---------------------------------------------------------------------------
# Underwriting
# ---------------------------------------------------------------------------
def save_underwriting(extraction_id: int, user_id: int, underwriting_json: str):
    conn = get_conn()
    # Add underwriting column if not exists
    try:
        conn.execute("ALTER TABLE extractions ADD COLUMN underwriting TEXT DEFAULT NULL")
        conn.commit()
    except sqlite3.OperationalError:
        pass  # column already exists
    conn.execute(
        "UPDATE extractions SET underwriting = ? WHERE id = ? AND user_id = ?",
        (underwriting_json, extraction_id, user_id),
    )
    conn.commit()
    conn.close()


def get_underwriting(extraction_id: int, user_id: int) -> Optional[str]:
    conn = get_conn()
    row = conn.execute(
        "SELECT underwriting FROM extractions WHERE id = ? AND user_id = ?",
        (extraction_id, user_id),
    ).fetchone()
    conn.close()
    return row["underwriting"] if row and row["underwriting"] else None
