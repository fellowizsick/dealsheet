import json, os, sys
from datetime import datetime

LEADS_FILE = os.path.join(os.path.dirname(__file__), "data", "leads.json")

def log_lead(email, source="signup", user_id=None):
    os.makedirs(os.path.dirname(LEADS_FILE), exist_ok=True)
    leads = []
    if os.path.exists(LEADS_FILE):
        with open(LEADS_FILE) as f:
            leads = json.load(f)
    leads.append({
        "email": email,
        "source": source,
        "user_id": user_id,
        "timestamp": datetime.utcnow().isoformat(),
        "notified": False,
    })
    with open(LEADS_FILE, "w") as f:
        json.dump(leads, f, indent=2, default=str)
    return len(leads)
