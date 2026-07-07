import io, csv, os, json
from datetime import date
from typing import List, Optional
from pathlib import Path

import stripe
import sentry_sdk
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse

# Sentry — error monitoring (opt-in via SENTRY_DSN env var)
SENTRY_DSN = os.environ.get("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=0.1,
        environment=os.environ.get("ENVIRONMENT", "production"),
    )

# PostHog — product analytics (opt-in via POSTHOG_API_KEY env var)
import posthog
POSTHOG_API_KEY = os.environ.get("POSTHOG_API_KEY")
if POSTHOG_API_KEY:
    posthog.project_api_key = POSTHOG_API_KEY
    posthog.host = os.environ.get("POSTHOG_HOST", "https://app.posthog.com")


def _capture(event: str, user_id: int, properties: dict = None):
    """Send event to PostHog (no-op if not configured)."""
    if POSTHOG_API_KEY:
        try:
            posthog.capture(str(user_id), event, properties=properties or {})
        except Exception:
            pass  # Don't let analytics break the app

from schemas import ExtractionResponse, UnderwritingResult, UnderwritingInput
from pdf_utils import extract_text_from_pdf, PDFTextExtractionError
from extractor import extract_purchase_agreement, MODEL_NAME
from csv_utils import result_to_csv_row, results_to_csv_bytes
from db import init_db, create_user, get_user_by_email, get_user_by_id, save_extraction, get_user_extractions, check_rate_limit, increment_request_count
from auth import hash_password, verify_password, generate_api_key, create_token, get_current_user
from leads import log_lead

# Underwriting engine
import math

# ---------------------------------------------------------------------------
# App Setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="DealSheet API",
    description="Extract structured data from real estate purchase agreements.",
    version="2.0.0",
)

FRONTEND_ORIGIN = os.environ.get("FRONTEND_URL", "http://localhost:3000")
# Allow both custom domain and Vercel preview domain
ALLOWED_ORIGINS = [
    FRONTEND_ORIGIN,
    "https://dealsheet-three.vercel.app",
    "https://frontend-two-rose-16.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RATE_LIMIT_PER_DAY = int(os.environ.get("RATE_LIMIT_PER_DAY", "50"))
BASE_DIR = Path(__file__).parent

# Stripe
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "").strip()
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

PRICE_IDS = {
    "pro": os.environ.get("STRIPE_PRO_PRICE_ID", "price_1TqJauGxy4Bq02M1Wa9dHqV1"),
    "agency": os.environ.get("STRIPE_AGENCY_PRICE_ID", "price_1TqJawGxy4Bq02M1gqWXv9Yt"),
}

STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "").strip()


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
def startup():
    """Auto-install missing packages (handles deploys without rebuild)."""
    import subprocess, sys
    try:
        import pg8000
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pg8000"])
    try:
        from db import get_pool
        conn = get_pool()
        conn.close()
    except Exception:
        pass  # DB might not be ready yet
    """Create data directory and database tables on first run."""


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
from pydantic import BaseModel

class SignupRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class FreeTrialRequest(BaseModel):
    email: str

class AuthResponse(BaseModel):
    token: str
    api_key: str
    user_id: int
    email: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    password: str

class VerifyEmailRequest(BaseModel):
    token: str


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
@app.post("/auth/signup", response_model=AuthResponse)
async def signup(body: SignupRequest):
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user = get_user_by_email(body.email)
    if user:
        raise HTTPException(status_code=409, detail="Email already registered")
    pwd_hash = hash_password(body.password)
    api_key = generate_api_key()
    user_id = create_user(body.email, pwd_hash, api_key)
    if user_id is None:
        raise HTTPException(status_code=409, detail="Email already registered")
    token = create_token(user_id)
    _capture("user_signed_up", user_id, {"email": body.email})
    log_lead(body.email, source="signup", user_id=user_id)
    return AuthResponse(token=token, api_key=api_key, user_id=user_id, email=body.email)


@app.post("/auth/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    user = get_user_by_email(body.email)
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"])
    _capture("user_logged_in", user["id"])
    return AuthResponse(token=token, api_key=user["api_key"], user_id=user["id"], email=user["email"])


# ---------------------------------------------------------------------------
# Email Verification
# ---------------------------------------------------------------------------
@app.post("/auth/send-verification")
async def send_verification(user: dict = Depends(get_current_user)):
    """Send verification email to the current user."""
    import resend, secrets
    from db import set_verification_token

    resend.api_key = os.environ.get("RESEND_API_KEY", "")
    if not resend.api_key:
        raise HTTPException(status_code=400, detail="Email service not configured")

    token = secrets.token_urlsafe(32)
    set_verification_token(user["id"], token)
    frontend = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    link = f"{frontend}/verify-email?token={token}"

    try:
        resend.Emails.send({
            "from": "DealSheet <noreply@dealsheet.app>",
            "to": user["email"],
            "subject": "Verify your DealSheet account",
            "html": f"""<p>Welcome to DealSheet!</p><p>Click <a href="{link}">here</a> to verify your email address.</p><p>Or paste this link: {link}</p>"""
        })
        return {"ok": True, "message": "Verification email sent"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/auth/verify-email")
async def verify_email(body: VerifyEmailRequest):
    """Verify email using token from email link."""
    from db import get_user_by_verification_token, set_verified
    user = get_user_by_verification_token(body.token)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    set_verified(user["id"])
    return {"ok": True, "message": "Email verified"}


# ---------------------------------------------------------------------------
# Password Reset
# ---------------------------------------------------------------------------
@app.post("/auth/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    """Send password reset email."""
    import secrets, resend
    from db import get_user_by_email, set_reset_token
    from datetime import datetime, timedelta, timezone

    user = get_user_by_email(body.email)
    # Always return OK to prevent email enumeration
    if not user:
        return {"ok": True, "message": "If that email exists, a reset link was sent"}

    resend.api_key = os.environ.get("RESEND_API_KEY", "")
    if not resend.api_key:
        return {"ok": True, "message": "If that email exists, a reset link was sent"}

    token = secrets.token_urlsafe(32)
    expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    set_reset_token(user["id"], token, expires)

    frontend = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    link = f"{frontend}/reset-password?token={token}"

    def send():
        try:
            resend.Emails.send({
                "from": "DealSheet <noreply@dealsheet.app>",
                "to": user["email"],
                "subject": "Reset your DealSheet password",
                "html": f"""<p>Click <a href="{link}">here</a> to reset your password.</p><p>This link expires in 1 hour.</p><p>If you didn't request this, ignore this email.</p>"""
            })
        except Exception:
            pass  # Log in production

    background_tasks.add_task(send)
    return {"ok": True, "message": "If that email exists, a reset link was sent"}


@app.post("/auth/reset-password")
async def reset_password(body: ResetPasswordRequest):
    """Reset password using token from email."""
    from db import get_user_by_reset_token, clear_reset_token
    from auth import hash_password

    user = get_user_by_reset_token(body.token)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    new_hash = hash_password(body.password)
    conn = get_db_conn()
    conn.execute("UPDATE users SET password = ? WHERE id = ?", (new_hash, user["id"]))
    conn.commit()
    conn.close()
    clear_reset_token(user["id"])
    return {"ok": True, "message": "Password reset successfully"}


# ---------------------------------------------------------------------------
# Rate limit — tiered (free 50/month, paid unlimited)
def check_rate(user: dict = Depends(get_current_user)):
    """Tiered rate limit: free users 50/month, paid users unlimited."""
    is_paid = user.get("subscription_status") in ("active", "canceled") and user.get("stripe_customer_id")
    max_per_period = 0 if is_paid else 10  # 0 = unlimited

    if max_per_period > 0 and not check_rate_limit(user["api_key"], max_per_period):
        raise HTTPException(
            status_code=429,
            detail=f"Free limit ({max_per_period}/month) reached. Subscribe for unlimited extractions.",
        )
    return user


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL_NAME}

@app.get("/debug")
async def debug():
    """Diagnose database, env vars, and imports."""
    import os, sys
    result = {"python": sys.version, "env": {}}
    for k in ["DATABASE_URL", "STRIPE_SECRET_KEY", "GEMINI_API_KEY", "JWT_SECRET", "FRONTEND_URL"]:
        v = os.environ.get(k, "")
        result["env"][k] = {"len": len(v), "start": v[:25] + "..." if len(v) > 25 else v}
    try:
        from db import get_pool
        conn = get_pool()
        cur = conn.cursor()
        cur.execute("SELECT count(*) AS cnt FROM users")
        result["db"] = f"connected, {cur.fetchone()[0]} users"
        conn.close()
    except Exception as e:
        result["db"] = f"FAILED: {e}"
        # Try to show what pg8000 parsed
        try:
            from urllib.parse import urlparse
            url = os.environ.get("DATABASE_URL", os.environ.get("PGURL", ""))
            parsed = urlparse(url)
            result["db_parse"] = {
                "hostname": parsed.hostname,
                "port": parsed.port,
                "username": parsed.username,
                "database": parsed.path.lstrip("/") if parsed.path else None,
            }
        except Exception as e2:
            result["db_parse_error"] = str(e2)
    try:
        import pg8000; result["pg8000"] = pg8000.__version__
    except ImportError:
        result["pg8000"] = "NOT INSTALLED"
    try:
        import bcrypt; result["bcrypt"] = bcrypt.__version__
    except Exception as e:
        result["bcrypt"] = f"FAILED: {e}"
    try:
        import jwt; result["jwt"] = jwt.__version__
    except Exception as e:
        result["jwt"] = f"FAILED: {e}"
    try:
        from auth import hash_password, generate_api_key, create_token
        from db import create_user as db_create
        pw = hash_password("test1234")
        key = generate_api_key()
        tok = create_token(1)
        result["signup_test"] = f"hash={len(pw)} key={len(key)} token={len(tok)}"
    except Exception as e:
        result["signup_test"] = f"FAILED: {e}"
    try:
        import stripe
        s = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": "price_1TqJauGxy4Bq02M1Wa9dHqV1", "quantity": 1}],
            success_url="https://example.com/success",
            cancel_url="https://example.com/cancel",
        )
        result["stripe_test"] = f"✅ URL: {s.url[:40]}..."
    except Exception as e:
        result["stripe_test"] = f"FAILED: {e}"
    return result

# ---------------------------------------------------------------------------
# Stripe
# ---------------------------------------------------------------------------
@app.post("/stripe/create-checkout")
async def create_checkout(plan: str = "pro", user: dict = Depends(get_current_user)):
    price_id = PRICE_IDS.get(plan)
    if not price_id or not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=400, detail="Stripe not configured. Set STRIPE_SECRET_KEY and price IDs.")

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{FRONTEND_ORIGIN}/dashboard?checkout=success",
            cancel_url=f"{FRONTEND_ORIGIN}/landing#pricing",
            metadata={"user_id": str(user["id"]), "plan": plan},
            client_reference_id=str(user["id"]),
        )
        return {"url": session.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/stripe/portal")
async def billing_portal(user: dict = Depends(get_current_user)):
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=400, detail="Stripe not configured")
    try:
        session = stripe.billing_portal.Session.create(
            customer=user.get("stripe_customer_id") or "",
            return_url=f"{FRONTEND_ORIGIN}/dashboard",
        )
        return {"url": session.url}
    except Exception:
        raise HTTPException(status_code=400, detail="No Stripe customer found. Subscribe first.")


@app.post("/stripe/cancel")
async def cancel_subscription(user: dict = Depends(get_current_user)):
    """Cancel subscription at period end. User keeps access until period expires."""
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=400, detail="Stripe not configured")

    customer_id = user.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="No active subscription found")

    try:
        # Find the user's active subscriptions
        subs = stripe.Subscription.list(customer=customer_id, status="active", limit=1)
        if not subs.data:
            raise HTTPException(status_code=400, detail="No active subscription found")

        sub = subs.data[0]
        # Cancel at period end — user keeps access until the current period finishes
        canceled = stripe.Subscription.update(
            sub.id,
            cancel_at_period_end=True,
        )
        ends_at = canceled.current_period_end  # unix timestamp
        from db import set_subscription
        set_subscription(user["id"], "canceled", str(ends_at))
        _capture("subscription_canceled", user["id"], {"ends_at": ends_at})
        return {
            "status": "canceled",
            "ends_at": ends_at,
            "message": "Subscription canceled. You'll keep access until your billing period ends.",
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/stripe/subscription")
async def get_subscription_status(user: dict = Depends(get_current_user)):
    """Get current subscription status for the user."""
    from db import get_subscription, get_db_conn
    import stripe

    # Check Stripe directly for the most accurate state
    customer_id = user.get("stripe_customer_id")
    if customer_id and STRIPE_SECRET_KEY:
        try:
            subs = stripe.Subscription.list(customer=customer_id, limit=1)
            if subs.data:
                sub = subs.data[0]
                return {
                    "status": sub.status,
                    "cancel_at_period_end": sub.cancel_at_period_end,
                    "current_period_end": sub.current_period_end,
                    "plan": sub.items.data[0].price.nickname if sub.items.data[0].price.nickname else "pro",
                }
        except Exception:
            pass

    # Fall back to local DB
    info = get_subscription(user["id"])
    return {
        "status": info["status"] or "free",
        "cancel_at_period_end": info["status"] == "canceled",
        "current_period_end": info["ends_at"],
        "plan": "free",
    }


@app.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=400, detail="Webhook secret not configured")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    # Verify signature — critical security check
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Idempotency — deduplicate event IDs
    conn = get_db_conn()
    try:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS processed_events (event_id TEXT PRIMARY KEY, created_at TEXT DEFAULT (datetime('now')))"
        )
        conn.commit()
    except Exception:
        pass
    existing = conn.execute(
        "SELECT 1 FROM processed_events WHERE event_id = ?", (event["id"],)
    ).fetchone()
    if existing:
        conn.close()
        return {"received": True, "duplicate": True}
    conn.execute("INSERT OR IGNORE INTO processed_events (event_id) VALUES (?)", (event["id"],))
    conn.commit()
    conn.close()

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = int(session["metadata"]["user_id"])
        conn = get_db_conn()
        conn.execute("UPDATE users SET stripe_customer_id = ? WHERE id = ?",
                     (session["customer"], user_id))
        conn.commit()
        conn.close()
        from db import set_subscription
        set_subscription(user_id, "active")

    elif event["type"] == "customer.subscription.updated":
        sub = event["data"]["object"]
        user_id = None
        # Find user by Stripe customer ID
        conn = get_db_conn()
        row = conn.execute(
            "SELECT id FROM users WHERE stripe_customer_id = ?",
            (sub["customer"],)
        ).fetchone()
        if row:
            user_id = row["id"]
            status = sub["status"]  # 'active', 'past_due', 'canceled', 'incomplete', etc.
            ends_at = sub.get("current_period_end")
            from db import set_subscription
            if status == "canceled" or sub.get("cancel_at_period_end"):
                set_subscription(user_id, "canceled", str(ends_at) if ends_at else None)
            elif status == "active":
                set_subscription(user_id, "active", str(ends_at) if ends_at else None)
            else:
                set_subscription(user_id, status, str(ends_at) if ends_at else None)
        conn.close()

    elif event["type"] == "customer.subscription.deleted":
        sub = event["data"]["object"]
        conn = get_db_conn()
        row = conn.execute(
            "SELECT id FROM users WHERE stripe_customer_id = ?",
            (sub["customer"],)
        ).fetchone()
        if row:
            from db import set_subscription
            set_subscription(row["id"], None)  # back to free
        conn.close()

    return {"received": True}


@app.post("/api/free-trial")
async def free_trial(body: FreeTrialRequest):
    log_lead(body.email, source="free-trial")
    # Generate a one-use trial token
    import secrets
    trial_token = secrets.token_urlsafe(16)
    return {
        "success": True,
        "message": "Free extraction link sent!",
        "trial_url": f"/trial/{trial_token}",
    }


def get_db_conn():
    from db import get_conn as _gc
    return _gc()


# ---------------------------------------------------------------------------
# Sample contract (onboarding)
# ---------------------------------------------------------------------------
@app.get("/sample-contract")
async def get_sample_contract():
    path = BASE_DIR / "sample_contract.pdf"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Sample contract not found")
    return FileResponse(str(path), media_type="application/pdf", filename="sample_contract.pdf")


# ---------------------------------------------------------------------------
# Extraction (sync — kept for small docs)
# ---------------------------------------------------------------------------
@app.post("/extract", response_model=ExtractionResponse)
async def extract(file: UploadFile = File(...), user: dict = Depends(check_rate)):
    # Check email verification
    if not user.get("is_verified"):
        raise HTTPException(status_code=403, detail="Verify your email first. Check your inbox or request a new verification link.")
    _validate_pdf(file)
    text = await _get_text(file)
    try:
        result = extract_purchase_agreement(text)
        extraction_id = save_extraction(user["id"], file.filename or "contract.pdf", result.model_dump_json())
        _capture("extraction_completed", user["id"], {"filename": file.filename})
        return result
    except Exception as e:
        _capture("extraction_failed", user["id"], {"error": str(e)})
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Extraction (async — background for large docs)
# ---------------------------------------------------------------------------
@app.post("/extract/async")
async def extract_async(file: UploadFile = File(...), background_tasks: BackgroundTasks = None, user: dict = Depends(get_current_user)):
    """Submit extraction to background job queue. Returns job_id for polling."""
    uuid = __import__("uuid")
    job_id = str(uuid.uuid4())
    _validate_pdf(file)
    content = await file.read()

    from db import create_job
    create_job(job_id, user["id"], file.filename or "contract.pdf")

    # Run extraction in background
    def run_extraction(jid, uid, data, fname):
        from db import update_job, save_extraction
        try:
            from pdf_utils import extract_text_from_pdf
            import io
            text = extract_text_from_pdf(io.BytesIO(data))
            result = extract_purchase_agreement(text)
            save_extraction(uid, fname, result.model_dump_json())
            update_job(jid, "completed", result.model_dump_json())
            _capture("extraction_completed", uid, {"filename": fname})
        except Exception as e:
            update_job(jid, "failed", error=str(e))
            _capture("extraction_failed", uid, {"error": str(e)})

    if background_tasks:
        background_tasks.add_task(run_extraction, job_id, user["id"], content, file.filename or "contract.pdf")
    else:
        # Fallback: run inline if no background tasks
        run_extraction(job_id, user["id"], content, file.filename or "contract.pdf")

    _capture("extraction_queued", user["id"], {"filename": file.filename})
    return {"job_id": job_id, "status": "queued"}


@app.get("/extract/status/{job_id}")
async def get_extraction_status(job_id: str, user: dict = Depends(get_current_user)):
    """Poll extraction job status."""
    from db import get_job
    job = get_job(job_id, user["id"])
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    resp = {"status": job["status"], "job_id": job_id}
    if job["status"] == "completed" and job["result_json"]:
        resp["result"] = json.loads(job["result_json"])
    if job["error"]:
        resp["error"] = job["error"]
    return resp


@app.post("/extract/csv")
async def extract_csv(file: UploadFile = File(...), user: dict = Depends(check_rate)):
    _validate_pdf(file)
    text = await _get_text(file)
    try:
        result = extract_purchase_agreement(text)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    save_extraction(user["id"], file.filename or "unknown.pdf", result.model_dump_json())
    increment_request_count(user["api_key"])
    row = result_to_csv_row(result, file.filename or "unknown.pdf")
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(row.keys())
    w.writerow(row.values())
    return StreamingResponse(
        iter([out.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=extract_{date.today()}.csv"},
    )


@app.post("/extract/batch/csv")
async def extract_batch_csv(files: List[UploadFile] = File(...), user: dict = Depends(check_rate)):
    rows = []
    for f in files:
        _validate_pdf(f)
        text = await _get_text(f)
        try:
            result = extract_purchase_agreement(text)
        except RuntimeError as e:
            raise HTTPException(status_code=400, detail=str(e))
        save_extraction(user["id"], f.filename or "unknown.pdf", result.model_dump_json())
        increment_request_count(user["api_key"])
        rows.append(result_to_csv_row(result, f.filename or "unknown.pdf"))
    csv_bytes = results_to_csv_bytes(rows)
    return StreamingResponse(
        iter([csv_bytes]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=batch_extract_{date.today()}.csv"},
    )


@app.get("/extractions")
async def list_extractions(user: dict = Depends(get_current_user)):
    return get_user_extractions(user["id"])


@app.patch("/extractions/{extraction_id}/status")
async def update_status(extraction_id: int, status: str, user: dict = Depends(get_current_user)):
    from db import update_extraction_status
    ok = update_extraction_status(extraction_id, user["id"], status)
    if not ok:
        raise HTTPException(status_code=404, detail="Extraction not found")
    return {"ok": True}


@app.patch("/extractions/{extraction_id}/tags")
async def update_tags(extraction_id: int, tags: str, user: dict = Depends(get_current_user)):
    from db import update_extraction_tags
    ok = update_extraction_tags(extraction_id, user["id"], tags)
    if not ok:
        raise HTTPException(status_code=404, detail="Extraction not found")
    return {"ok": True}


@app.get("/pipeline/stats")
async def pipeline_stats(user: dict = Depends(get_current_user)):
    from db import get_pipeline_stats
    return get_pipeline_stats(user["id"])


@app.post("/pipeline/manual-deal")
async def add_manual_deal(data: dict, user: dict = Depends(get_current_user)):
    from db import save_manual_deal
    save_manual_deal(user["id"], data.get("filename", "Manual Deal"), json.dumps(data.get("result", {})), data.get("status", "active"), data.get("tags", ""))
    return {"ok": True}


# ---------------------------------------------------------------------------
# Underwriting
# ---------------------------------------------------------------------------
@app.post("/extractions/{extraction_id}/underwrite", response_model=UnderwritingResult)
async def underwrite_deal(extraction_id: int, body: UnderwritingInput, user: dict = Depends(get_current_user)):
    """Calculate underwriting metrics for a deal."""
    pp = body.purchase_price
    if not pp or pp <= 0:
        raise HTTPException(status_code=400, detail="Purchase price must be greater than 0")
    
    dp = pp * (body.down_payment_percent / 100)
    total_cash = dp + body.closing_costs

    result = UnderwritingResult(assumptions=body)

    # Mortgage calculation
    loan = pp - dp
    if loan > 0 and body.interest_rate > 0 and body.loan_term_years > 0:
        monthly_rate = (body.interest_rate / 100) / 12
        n_payments = body.loan_term_years * 12
        debt_service = loan * (monthly_rate * (1 + monthly_rate) ** n_payments) / ((1 + monthly_rate) ** n_payments - 1)
        result.debt_service = round(debt_service, 2)
    else:
        result.debt_service = 0

    # Income property analysis (cap rate, cash-on-cash)
    if body.monthly_rent and body.annual_expenses is not None:
        annual_rent = body.monthly_rent * 12
        noi = annual_rent - body.annual_expenses
        result.noi = round(noi, 2) if noi else 0

        if pp > 0:
            result.cap_rate = round((noi / pp) * 100, 2) if noi else 0

        annual_debt = (result.debt_service or 0) * 12
        annual_cash_flow = noi - annual_debt
        result.monthly_cash_flow = round(annual_cash_flow / 12, 2) if annual_cash_flow else 0

        if total_cash > 0:
            result.cash_on_cash_return = round((annual_cash_flow / total_cash) * 100, 2) if annual_cash_flow else 0

        result.total_cash_invested = round(total_cash, 2)

    # Flip analysis
    if body.rehab_cost is not None and body.after_repair_value is not None:
        flip_profit = body.after_repair_value - pp - body.rehab_cost
        result.flip_profit = round(flip_profit, 2) if flip_profit else 0
        if body.after_repair_value > 0:
            result.flip_margin = round((flip_profit / body.after_repair_value) * 100, 2) if flip_profit else 0

    # Add total_cash_invested if not already set
    if result.total_cash_invested is None:
        result.total_cash_invested = round(total_cash, 2)

    # Save to DB
    from db import save_underwriting
    import json
    save_underwriting(extraction_id, user["id"], result.model_dump_json())

    return result


@app.get("/extractions/{extraction_id}/underwrite")
async def get_deal_underwriting(extraction_id: int, user: dict = Depends(get_current_user)):
    """Get saved underwriting analysis for a deal."""
    from db import get_underwriting
    data = get_underwriting(extraction_id, user["id"])
    if not data:
        return None
    return json.loads(data)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


def _validate_pdf(file: UploadFile):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="Only PDF files are accepted.")
    # Check magic bytes — PDFs start with %PDF
    if file.content_type and file.content_type not in ("application/pdf",):
        raise HTTPException(status_code=422, detail="File content type is not PDF.")
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large. Max {MAX_FILE_SIZE // (1024*1024)} MB.")


async def _get_text(file: UploadFile) -> str:
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=422, detail="Empty file.")
    if len(raw) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large. Max {MAX_FILE_SIZE // (1024*1024)} MB.")
    if not raw.startswith(b"%PDF"):
        raise HTTPException(status_code=422, detail="File is not a valid PDF (missing PDF header).")
    try:
        return extract_text_from_pdf(raw)
    except PDFTextExtractionError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
