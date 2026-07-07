"""Supabase/Postgres database layer for DealSheet."""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timezone
from typing import Optional

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres.bfolwcqzxleympwshmju:DealSheetDB2026!@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
)


def get_pool():
    """Simple direct connection (pooling handled by Supabase pgBouncer)."""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor, sslmode="require")


# Alias for backwards compatibility with main.py
get_conn = get_pool


def init_db():
    """Tables already created via migration. This is a no-op for new Postgres."""
    pass


def create_user(email: str, password_hash: str, api_key: str) -> Optional[int]:
    conn = get_pool()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (email, password, api_key) VALUES (%s, %s, %s) RETURNING id",
            (email, password_hash, api_key),
        )
        user_id = cur.fetchone()["id"]
        conn.commit()
        return user_id
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return None
    finally:
        conn.close()


def get_user_by_email(email: str) -> Optional[dict]:
    conn = get_pool()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE email = %s", (email,))
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_user_by_id(user_id: int) -> Optional[dict]:
    conn = get_pool()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_user_by_api_key(api_key: str) -> Optional[dict]:
    conn = get_pool()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE api_key = %s", (api_key,))
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def migrate_user_schema():
    """Schema already created. No-op stub for compatibility."""
    pass


def set_subscription(user_id: int, status: str, ends_at: str = None):
    conn = get_pool()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE users SET subscription_status = %s, subscription_ends_at = %s WHERE id = %s",
            (status, ends_at, user_id),
        )
        conn.commit()
    finally:
        conn.close()


def get_subscription(user_id: int) -> dict:
    conn = get_pool()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT subscription_status, subscription_ends_at FROM users WHERE id = %s",
            (user_id,),
        )
        row = cur.fetchone()
        if row and row.get("subscription_status"):
            return {"status": row["subscription_status"], "ends_at": row.get("subscription_ends_at")}
        return {"status": None, "ends_at": None}
    finally:
        conn.close()


def set_verified(user_id: int):
    conn = get_pool()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE users SET is_verified = '1', verification_token = NULL WHERE id = %s", (user_id,))
        conn.commit()
    finally:
        conn.close()


def set_verification_token(user_id: int, token: str):
    conn = get_pool()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE users SET verification_token = %s WHERE id = %s", (token, user_id))
        conn.commit()
    finally:
        conn.close()


def get_user_by_verification_token(token: str) -> Optional[dict]:
    conn = get_pool()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE verification_token = %s", (token,))
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def set_reset_token(user_id: int, token: str, expires: str):
    conn = get_pool()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE users SET reset_token = %s, reset_token_expires = %s WHERE id = %s",
            (token, expires, user_id),
        )
        conn.commit()
    finally:
        conn.close()


def get_user_by_reset_token(token: str) -> Optional[dict]:
    conn = get_pool()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM users WHERE reset_token = %s AND reset_token_expires > NOW()",
            (token,),
        )
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def clear_reset_token(user_id: int):
    conn = get_pool()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = %s", (user_id,))
        conn.commit()
    finally:
        conn.close()


def create_job(job_id: str, user_id: int, filename: str) -> int:
    conn = get_pool()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO extraction_jobs (id, user_id, filename, status) VALUES (%s, %s, %s, 'queued')",
            (job_id, user_id, filename),
        )
        conn.commit()
        return 1
    finally:
        conn.close()


def update_job(job_id: str, status: str, result_json: str = None):
    conn = get_pool()
    try:
        cur = conn.cursor()
        if result_json:
            cur.execute(
                "UPDATE extraction_jobs SET status = %s, result_json = %s, completed_at = NOW() WHERE id = %s",
                (status, result_json, job_id),
            )
        else:
            cur.execute(
                "UPDATE extraction_jobs SET status = %s, completed_at = NOW() WHERE id = %s",
                (status, job_id),
            )
        conn.commit()
    finally:
        conn.close()


def get_job(job_id: str) -> Optional[dict]:
    conn = get_pool()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM extraction_jobs WHERE id = %s", (job_id,))
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def save_extraction(user_id: int, filename: str, result_json: str) -> int:
    conn = get_pool()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO extractions (user_id, filename, result_json) VALUES (%s, %s, %s) RETURNING id",
            (user_id, filename, result_json),
        )
        ext_id = cur.fetchone()["id"]
        conn.commit()
        return ext_id
    finally:
        conn.close()


def get_user_extractions(user_id: int, limit: int = 50) -> list:
    conn = get_pool()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM extractions WHERE user_id = %s ORDER BY created_at DESC LIMIT %s",
            (user_id, limit),
        )
        rows = cur.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def update_extraction_status(extraction_id: int, user_id: int, status: str) -> bool:
    conn = get_pool()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE extractions SET status = %s WHERE id = %s AND user_id = %s",
            (status, extraction_id, user_id),
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def update_extraction_tags(extraction_id: int, user_id: int, tags: str) -> bool:
    conn = get_pool()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE extractions SET tags = %s WHERE id = %s AND user_id = %s",
            (tags, extraction_id, user_id),
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def get_pipeline_stats(user_id: int) -> dict:
    conn = get_pool()
    try:
        cur = conn.cursor()
        cur.execute(
            """SELECT
                COUNT(*) FILTER (WHERE status = 'active') AS active,
                COUNT(*) FILTER (WHERE status = 'under_contract') AS under_contract,
                COUNT(*) FILTER (WHERE status = 'closed') AS closed,
                COUNT(*) FILTER (WHERE status = 'archived') AS archived,
                COUNT(*) AS total
            FROM extractions WHERE user_id = %s""",
            (user_id,),
        )
        return dict(cur.fetchone())
    finally:
        conn.close()


def save_manual_deal(user_id: int, filename: str, result_json: str, status: str, tags: str):
    conn = get_pool()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO extractions (user_id, filename, result_json, status, tags) VALUES (%s, %s, %s, %s, %s)",
            (user_id, filename, result_json, status, tags),
        )
        conn.commit()
    finally:
        conn.close()


def check_rate_limit(api_key: str, max_per_month: int = 10) -> bool:
    """Returns True if under limit, False if over. Uses UTC month boundaries."""
    conn = get_pool()
    try:
        cur = conn.cursor()
        this_month = datetime.now(timezone.utc).strftime("%Y-%m")
        cur.execute(
            "SELECT requests_month, last_month_date FROM users WHERE api_key = %s",
            (api_key,),
        )
        user = cur.fetchone()
        if user is None:
            return False

        if user["last_month_date"] != this_month:
            cur.execute(
                "UPDATE users SET requests_month = 0, last_month_date = %s WHERE api_key = %s",
                (this_month, api_key),
            )
            conn.commit()
            return True

        under = (user["requests_month"] or 0) < max_per_month
        return under
    finally:
        conn.close()


def increment_request_count(api_key: str):
    conn = get_pool()
    try:
        cur = conn.cursor()
        this_month = datetime.now(timezone.utc).strftime("%Y-%m")
        cur.execute(
            "UPDATE users SET requests_month = requests_month + 1, last_month_date = %s WHERE api_key = %s",
            (this_month, api_key),
        )
        conn.commit()
    finally:
        conn.close()
