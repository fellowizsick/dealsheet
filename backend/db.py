"""Supabase/Postgres database layer for DealSheet using pg8000 (pure Python)."""
import os
from collections import OrderedDict
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse, unquote

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres.bfolwcqzxleympwshmju:DealSheetDB2026!@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
)


def get_pool():
    """Simple direct connection (pooling handled by Supabase pgBouncer).
    Parses DATABASE_URL manually since pg8000 doesn't support URL DSN."""
    import pg8000
    parsed = urlparse(DATABASE_URL)
    return pg8000.connect(
        host=parsed.hostname or "aws-0-us-east-1.pooler.supabase.com",
        port=parsed.port or 6543,
        database=parsed.path.lstrip("/") if parsed.path else "postgres",
        user=parsed.username or "postgres.bfolwcqzxleympwshmju",
        password=unquote(parsed.password) if parsed.password else "DealSheetDB2026!"
    )


# Alias for backwards compatibility with main.py
get_conn = get_pool


def _cols(cur):
    """Get column names from a pg8000 cursor description."""
    return [d[0] for d in cur.description] if cur.description else []


def _row_to_dict(row, cur):
    """Convert a pg8000 row (tuple) to a dict using column names."""
    if row is None:
        return None
    cols = _cols(cur)
    return OrderedDict(zip(cols, row))


def _rows_to_dicts(rows, cur):
    """Convert list of pg8000 rows to list of dicts."""
    if not rows:
        return []
    cols = _cols(cur)
    return [OrderedDict(zip(cols, r)) for r in rows]


def init_db():
    """Tables already created via migration."""
    pass


def create_user(email: str, password_hash: str, api_key: str) -> Optional[int]:
    conn = get_pool()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (email, password, api_key) VALUES (%s, %s, %s) RETURNING id",
            (email, password_hash, api_key),
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        return user_id
    except Exception:
        conn.rollback()
        return None
    finally:
        conn.close()


def get_user_by_email(email: str) -> Optional[dict]:
    conn = get_pool()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, email, password, api_key, stripe_customer_id, subscription_status, subscription_ends_at, is_verified, verification_token, reset_token, reset_token_expires, requests_month, last_month_date, created_at FROM users WHERE email = %s", (email,))
        row = cur.fetchone()
        return _row_to_dict(row, cur) if row else None
    finally:
        conn.close()


def get_user_by_id(user_id: int) -> Optional[dict]:
    conn = get_pool()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, email, password, api_key, stripe_customer_id, subscription_status, subscription_ends_at, is_verified, verification_token, reset_token, reset_token_expires, requests_month, last_month_date, created_at FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        return _row_to_dict(row, cur) if row else None
    finally:
        conn.close()


def get_user_by_api_key(api_key: str) -> Optional[dict]:
    conn = get_pool()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, email, password, api_key, stripe_customer_id, subscription_status, subscription_ends_at, is_verified, verification_token, reset_token, reset_token_expires, requests_month, last_month_date, created_at FROM users WHERE api_key = %s", (api_key,))
        row = cur.fetchone()
        return _row_to_dict(row, cur) if row else None
    finally:
        conn.close()


def migrate_user_schema():
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
        d = _row_to_dict(row, cur) if row else None
        if d and d.get("subscription_status"):
            return {"status": d["subscription_status"], "ends_at": d.get("subscription_ends_at")}
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
        cur.execute("SELECT id, email, password, api_key, stripe_customer_id, subscription_status, subscription_ends_at, is_verified, verification_token, reset_token, reset_token_expires, requests_month, last_month_date, created_at FROM users WHERE verification_token = %s", (token,))
        row = cur.fetchone()
        return _row_to_dict(row, cur) if row else None
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
            "SELECT id, email, password, api_key, stripe_customer_id, subscription_status, subscription_ends_at, is_verified, verification_token, reset_token, reset_token_expires, requests_month, last_month_date, created_at FROM users WHERE reset_token = %s AND reset_token_expires > NOW()",
            (token,),
        )
        row = cur.fetchone()
        return _row_to_dict(row, cur) if row else None
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
        return _row_to_dict(row, cur) if row else None
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
        ext_id = cur.fetchone()[0]
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
        return _rows_to_dicts(rows, cur) if rows else []
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
        row = cur.fetchone()
        return _row_to_dict(row, cur) if row else {"active": 0, "under_contract": 0, "closed": 0, "archived": 0, "total": 0}
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
    conn = get_pool()
    try:
        cur = conn.cursor()
        this_month = datetime.now(timezone.utc).strftime("%Y-%m")
        cur.execute(
            "SELECT requests_month, last_month_date FROM users WHERE api_key = %s",
            (api_key,),
        )
        row = cur.fetchone()
        d = _row_to_dict(row, cur) if row else None
        if d is None:
            return False

        if d["last_month_date"] != this_month:
            cur.execute(
                "UPDATE users SET requests_month = 0, last_month_date = %s WHERE api_key = %s",
                (this_month, api_key),
            )
            conn.commit()
            return True

        under = (d["requests_month"] or 0) < max_per_month
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
