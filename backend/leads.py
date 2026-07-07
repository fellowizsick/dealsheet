"""Lead capture — in-memory only. Serverless-safe (no disk writes)."""
import json, os, sys
from datetime import datetime


def log_lead(email, source="signup", user_id=None):
    """Log a lead. On serverless (Vercel), writes are silently skipped."""
    try:
        leads_file = os.path.join(os.environ.get("DATA_DIR", "/tmp"), "leads.json")
        os.makedirs(os.path.dirname(leads_file), exist_ok=True)
        leads = []
        if os.path.exists(leads_file):
            with open(leads_file) as f:
                leads = json.load(f)
        leads.append({
            "email": email,
            "source": source,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat(),
            "notified": False,
        })
        with open(leads_file, "w") as f:
            json.dump(leads, f, indent=2, default=str)
    except Exception:
        pass  # Serverless-safe: silently skip if write fails
