import logging
import re
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from urllib.parse import urlencode

from sqlalchemy.orm import Session
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.core.gmail_config import (
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    GMAIL_REDIRECT_URI,
    GMAIL_SCOPES,
)
from app.models.gmail_token import GmailToken
from app.services.ai_categorizer import suggest_category

logger = logging.getLogger(__name__)

BANK_SENDERS = [
    "alerts@hdfcbank.net",
    "alerts@icicibank.com",
    "alerts@axisbank.com",
    "sbi.co.in",
    "kotakbank.com",
]

SEARCH_QUERY = (
    "(from:alerts@hdfcbank.net OR from:alerts@icicibank.com "
    "OR from:alerts@axisbank.com OR from:sbi.co.in "
    "OR from:kotakbank.com OR subject:\"transaction alert\" "
    "OR subject:\"debited\" OR subject:\"credited\" "
    "OR subject:\"payment\" OR subject:\"spent\" "
    "OR subject:\"UPI\" OR subject:\"NEFT\" OR subject:\"IMPS\")"
)


def get_auth_url(user_id: str) -> str:
    params = {
        "client_id": GMAIL_CLIENT_ID,
        "redirect_uri": GMAIL_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(GMAIL_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": user_id,
    }
    return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"


def exchange_code_for_token(code: str, state: str, db: Session) -> None:
    import httpx

    resp = httpx.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": GMAIL_CLIENT_ID,
            "client_secret": GMAIL_CLIENT_SECRET,
            "redirect_uri": GMAIL_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=30,
    )
    resp.raise_for_status()
    token_data = resp.json()

    existing = db.query(GmailToken).filter(GmailToken.user_id == state).first()
    if existing:
        existing.access_token = token_data["access_token"]
        existing.refresh_token = token_data.get("refresh_token", existing.refresh_token)
        existing.token_expiry = datetime.fromtimestamp(
            token_data.get("expires_in", 3600) + datetime.now(timezone.utc).timestamp(),
            tz=timezone.utc,
        )
        existing.is_connected = True
    else:
        token = GmailToken(
            user_id=state,
            access_token=token_data["access_token"],
            refresh_token=token_data.get("refresh_token"),
            token_expiry=datetime.fromtimestamp(
                token_data.get("expires_in", 3600) + datetime.now(timezone.utc).timestamp(),
                tz=timezone.utc,
            ),
            is_connected=True,
        )
        db.add(token)
    db.commit()


def _get_credentials(user_id: str, db: Session) -> Optional[Credentials]:
    token_row = db.query(GmailToken).filter(
        GmailToken.user_id == user_id,
        GmailToken.is_connected == True,
    ).first()
    if not token_row or not token_row.access_token:
        return None
    creds = Credentials(
        token=token_row.access_token,
        refresh_token=token_row.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GMAIL_CLIENT_ID,
        client_secret=GMAIL_CLIENT_SECRET,
        scopes=GMAIL_SCOPES,
    )
    if creds.expired and creds.refresh_token:
        try:
            from google.auth.transport.requests import Request
            creds.refresh(Request())
            token_row.access_token = creds.token
            token_row.token_expiry = creds.expiry
            db.commit()
        except Exception:
            logger.exception("Failed to refresh Gmail token")
            return None
    return creds


def fetch_bank_emails(user_id: str, days: int = 30, db: Optional[Session] = None) -> list[dict]:
    creds = _get_credentials(user_id, db) if db else None
    if not creds:
        raise ValueError("Gmail not connected. Please reconnect.")

    service = build("gmail", "v1", credentials=creds)
    newer = f"newer_than:{days}d"
    query = f"({SEARCH_QUERY}) {newer}"

    results = service.users().messages().list(userId="me", q=query, maxResults=50).execute()
    messages = results.get("messages", [])

    transactions = []
    for msg in messages:
        full = service.users().messages().get(userId="me", id=msg["id"], format="full").execute()
        parsed = _parse_message(full)
        if parsed and parsed.get("amount"):
            transactions.append(parsed)

    return transactions


def _parse_message(msg: dict) -> Optional[dict]:
    try:
        headers = {h["name"]: h["value"] for h in msg["payload"]["headers"]}
        subject = headers.get("Subject", "")
        sender = headers.get("From", "")
        date_str = headers.get("Date", "")
        snippet = msg.get("snippet", "")

        body = ""
        parts = msg["payload"].get("parts", [])
        if parts:
            for part in parts:
                if part.get("mimeType") == "text/plain":
                    import base64
                    data = part["body"].get("data", "")
                    if data:
                        body = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
                    break

        combined = f"{subject} {snippet} {body}"

        amount = _extract_amount(combined)
        if not amount:
            return None

        txn_type = "debit"
        if re.search(r"credited|received|credited|deposit", combined, re.IGNORECASE):
            txn_type = "credit"

        merchant = _extract_merchant(combined)
        date = _parse_date(date_str)
        bank = _extract_bank(sender)
        suggested = suggest_category(merchant or "")

        return {
            "amount": amount,
            "type": txn_type,
            "merchant": merchant or "Unknown",
            "date": date,
            "bank": bank,
            "suggested_category": suggested,
            "raw_subject": subject,
            "raw_snippet": snippet,
        }
    except Exception as e:
        logger.debug("Failed to parse email: %s", e)
        return None


def _extract_amount(text: str) -> Optional[float]:
    patterns = [
        r"(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)",
        r"(?:Rs\.?|INR|₹)\s*([\d]+)",
        r"amount\s*(?:is|:)?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            try:
                return float(m.group(1).replace(",", ""))
            except ValueError:
                continue
    return None


def _extract_merchant(text: str) -> Optional[str]:
    patterns = [
        r"(?:at|to|via|for)\s+([A-Z][A-Za-z0-9\s&.-]{2,40})",
        r"(?:merchant|payee|vendor)\s*(?::|is)?\s*([A-Z][A-Za-z0-9\s&.-]{2,40})",
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            return m.group(1).strip()
    return None


def _parse_date(date_str: str) -> str:
    try:
        from email.utils import parsedate_to_datetime
        dt = parsedate_to_datetime(date_str)
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _extract_bank(sender: str) -> str:
    sender_lower = sender.lower()
    if "hdfc" in sender_lower:
        return "HDFC Bank"
    if "icici" in sender_lower:
        return "ICICI Bank"
    if "axis" in sender_lower:
        return "Axis Bank"
    if "sbi" in sender_lower or "state bank" in sender_lower:
        return "SBI"
    if "kotak" in sender_lower:
        return "Kotak Mahindra"
    return "Other Bank"
