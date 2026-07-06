import io, csv, os, json
from datetime import date
from typing import List, Optional
from pathlib import Path

import stripe
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse

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
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RATE_LIMIT_PER_DAY = int(os.environ.get("RATE_LIMIT_PER_DAY", "50"))
BASE_DIR = Path(__file__).parent

# Stripe
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

PRICE_IDS = {
    "pro": os.environ.get("STRIPE_PRO_PRICE_ID", "price_1TqJauGxy4Bq02M1Wa9dHqV1"),
    "agency": os.environ.get("STRIPE_AGENCY_PRICE_ID", "price_1TqJawGxy4Bq02M1gqWXv9Yt"),
}

STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
def startup():
    init_db()


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


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
@app.post("/auth/signup", response_model=AuthResponse)
async def signup(body: SignupRequest):
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    pwd_hash = hash_password(body.password)
    api_key = generate_api_key()
    user_id = create_user(body.email, pwd_hash, api_key)
    if user_id is None:
        raise HTTPException(status_code=409, detail="Email already registered")
    token = create_token(user_id)
    log_lead(body.email, source="signup", user_id=user_id)
    return AuthResponse(token=token, api_key=api_key, user_id=user_id, email=body.email)


@app.post("/auth/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    user = get_user_by_email(body.email)
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"])
    return AuthResponse(token=token, api_key=user["api_key"], user_id=user["id"], email=user["email"])


# ---------------------------------------------------------------------------
# Rate limit
# ---------------------------------------------------------------------------
def check_rate(user: dict = Depends(get_current_user)):
    if not check_rate_limit(user["api_key"], RATE_LIMIT_PER_DAY):
        raise HTTPException(status_code=429, detail=f"Rate limit ({RATE_LIMIT_PER_DAY}/day) exceeded")
    return user


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL_NAME}

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


@app.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=400, detail="Webhook secret not configured")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = int(session["metadata"]["user_id"])
        # Mark user as subscribed - store Stripe customer ID
        conn = get_db_conn()
        conn.execute("UPDATE users SET stripe_customer_id = ? WHERE id = ?",
                     (session["customer"], user_id))
        conn.commit()
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
# Protected Endpoints
# ---------------------------------------------------------------------------
@app.post("/extract", response_model=ExtractionResponse)
async def extract(file: UploadFile = File(...), user: dict = Depends(check_rate)):
    _validate_pdf(file)
    text = await _get_text(file)
    try:
        result = extract_purchase_agreement(text)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    save_extraction(user["id"], file.filename or "unknown.pdf", result.model_dump_json())
    increment_request_count(user["api_key"])
    return result


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
    dp = pp * (body.down_payment_percent / 100)
    total_cash = dp + body.closing_costs

    result = UnderwritingResult(assumptions=body)

    # Mortgage calculation
    loan = pp - dp
    if loan > 0 and body.interest_rate > 0 and body.loan_term_years > 0:
        monthly_rate = (body.interest_rate / 100) / 12
        n_payments = body.loan_term_years * 12
        if monthly_rate > 0:
            debt_service = loan * (monthly_rate * (1 + monthly_rate) ** n_payments) / ((1 + monthly_rate) ** n_payments - 1)
        else:
            debt_service = loan / n_payments
        result.debt_service = round(debt_service, 2)
    else:
        result.debt_service = 0

    # Income property analysis (cap rate, cash-on-cash)
    if body.monthly_rent and body.annual_expenses is not None:
        annual_rent = body.monthly_rent * 12
        noi = annual_rent - body.annual_expenses
        result.noi = round(noi, 2)

        if pp > 0:
            result.cap_rate = round((noi / pp) * 100, 2)

        annual_debt = (result.debt_service or 0) * 12
        annual_cash_flow = noi - annual_debt
        result.monthly_cash_flow = round(annual_cash_flow / 12, 2)

        if total_cash > 0:
            result.cash_on_cash_return = round((annual_cash_flow / total_cash) * 100, 2)

        result.total_cash_invested = round(total_cash, 2)

    # Flip analysis
    if body.rehab_cost is not None and body.after_repair_value is not None:
        flip_profit = body.after_repair_value - pp - body.rehab_cost
        result.flip_profit = round(flip_profit, 2)
        if body.after_repair_value > 0:
            result.flip_margin = round((flip_profit / body.after_repair_value) * 100, 2)

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
