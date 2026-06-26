from fastapi import APIRouter, Depends, Query, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text, create_engine
from sqlalchemy.orm import sessionmaker
from typing import Optional, List
import os
import json
import re
import base64
import uuid
from datetime import datetime, timedelta
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.core.config import settings
import structlog

logger = structlog.get_logger()
router = APIRouter()

GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET = settings.GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI = settings.GOOGLE_REDIRECT_URI
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
GMAIL_SCOPES = "https://www.googleapis.com/auth/gmail.readonly"


def _get_db_session():
    """Create a fresh DB session outside FastAPI dependency injection."""
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()


def get_gmail_service(user_id: str, db: Session):
    """Get authenticated Gmail service for user."""
    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        from google.auth.transport.requests import Request

        result = db.execute(
            text("SELECT access_token, refresh_token, token_expiry "
                 "FROM gmail_tokens WHERE user_id = :uid "
                 "AND is_connected = TRUE"),
            {"uid": str(user_id)}
        ).fetchone()

        if not result:
            return None

        creds = Credentials(
            token=result.access_token,
            refresh_token=result.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            scopes=[GMAIL_SCOPES],
        )

        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            db.execute(
                text("UPDATE gmail_tokens SET access_token = :at, "
                     "token_expiry = :te, updated_at = NOW() "
                     "WHERE user_id = :uid"),
                {
                    "at": creds.token,
                    "te": creds.expiry,
                    "uid": str(user_id)
                }
            )
            db.commit()

        return build("gmail", "v1", credentials=creds)
    except Exception as e:
        logger.error(f"Gmail service error: {e}")
        return None


def parse_amount(text_content: str) -> Optional[float]:
    """Extract amount from email text."""
    patterns = [
        r'Rs\.?\s*([0-9,]+(?:\.[0-9]{2})?)',
        r'INR\s*([0-9,]+(?:\.[0-9]{2})?)',
        r'\u20b9\s*([0-9,]+(?:\.[0-9]{2})?)',
        r'([0-9,]+(?:\.[0-9]{2})?)\s*(?:Rs|INR|\u20b9)',
    ]
    for pattern in patterns:
        match = re.search(pattern, text_content, re.IGNORECASE)
        if match:
            amount_str = match.group(1).replace(',', '')
            try:
                return float(amount_str)
            except ValueError:
                continue
    return None


def parse_merchant(text_content: str) -> str:
    """Extract merchant name from email."""
    patterns = [
        r'(?:at|to|for|merchant[:\s]+)([A-Z][A-Za-z0-9\s&\-\.]+?)(?:\s+on|\s+via|\s+for|\.|,|$)',
        r'(?:paid to|sent to|transfer to)\s+([A-Z][A-Za-z0-9\s]+?)(?:\s+on|\.|,|$)',
    ]
    for pattern in patterns:
        match = re.search(pattern, text_content)
        if match:
            merchant = match.group(1).strip()
            if len(merchant) > 2:
                return merchant[:50]
    return "Unknown"


def get_transaction_type(text_content: str) -> str:
    """Determine if transaction is debit or credit."""
    text_lower = text_content.lower()
    debit_words = ['debited', 'debit', 'spent', 'paid',
                   'payment', 'purchase', 'withdrawn',
                   'transferred', 'sent']
    credit_words = ['credited', 'credit', 'received',
                    'deposited', 'refund', 'cashback']
    for word in debit_words:
        if word in text_lower:
            return 'debit'
    for word in credit_words:
        if word in text_lower:
            return 'credit'
    return 'debit'


def suggest_category(merchant: str, text_content: str) -> str:
    """Suggest expense category from merchant/text."""
    combined = f"{merchant} {text_content}".lower()
    rules = {
        'Food': ['swiggy', 'zomato', 'restaurant', 'food',
                 'cafe', 'pizza', 'biryani', 'eat', 'lunch',
                 'dinner', 'breakfast', 'grocery', 'bigbasket',
                 'blinkit', 'zepto', 'dunzo'],
        'Fuel': ['petrol', 'diesel', 'fuel', 'hp pump',
                 'iocl', 'bharat petroleum', 'indian oil',
                 'shell', 'cng'],
        'Travel': ['uber', 'ola', 'rapido', 'cab', 'flight',
                   'airline', 'indigo', 'bus', 'train', 'irctc',
                   'metro', 'toll', 'makemytrip', 'goibibo'],
        'OTT Subscriptions': ['netflix', 'amazon prime',
                              'hotstar', 'disney', 'spotify',
                              'youtube premium', 'zee5',
                              'sonyliv'],
        'Shopping': ['amazon', 'flipkart', 'myntra', 'meesho',
                     'ajio', 'nykaa', 'mall'],
        'Mobile Recharge': ['jio', 'airtel', 'vi', 'bsnl',
                            'recharge', 'prepaid', 'postpaid'],
        'Utilities': ['electricity', 'water bill', 'gas',
                      'broadband', 'wifi', 'internet'],
        'Medical': ['pharmacy', 'hospital', 'clinic', 'doctor',
                    'medicine', 'apollo', 'medplus', '1mg',
                    'netmeds'],
        'Entertainment': ['movie', 'pvr', 'inox',
                          'bookmyshow', 'gaming', 'concert'],
    }
    for category, keywords in rules.items():
        if any(kw in combined for kw in keywords):
            return category
    return 'Other'


@router.get("/auth-url")
def get_auth_url(
    current_user: User = Depends(get_current_user)
):
    """Get Google OAuth authorization URL."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth not configured. "
                   "Add GOOGLE_CLIENT_ID to environment variables."
        )

    state = str(current_user.id)
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope={GMAIL_SCOPES}"
        f"&access_type=offline"
        f"&prompt=consent"
        f"&state={state}"
    )
    logger.info(
        "Gmail OAuth URL generated",
        redirect_uri=GOOGLE_REDIRECT_URI,
        client_id_prefix=GOOGLE_CLIENT_ID[:8] if GOOGLE_CLIENT_ID else "NOT_SET",
        frontend_url=FRONTEND_URL,
    )
    return {"auth_url": auth_url}


@router.get("/callback")
def gmail_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
):
    """Handle Google OAuth callback. Self-contained — no FastAPI dependency injection."""
    logger.info(
        "Gmail callback received",
        state=state,
        has_code=bool(code),
        has_error=bool(error),
        redirect_uri=GOOGLE_REDIRECT_URI,
    )
    if error:
        logger.error(f"OAuth error: {error}")
        return RedirectResponse(
            url=f"{FRONTEND_URL}/gmail-import?error={error}"
        )

    if not code or not state:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/gmail-import?error=missing_params"
        )

    import httpx

    try:
        logger.info(
            "Exchanging Gmail authorization code for tokens",
            redirect_uri=GOOGLE_REDIRECT_URI,
        )
        token_response = httpx.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            }
        )
        token_data = token_response.json()

        if "error" in token_data:
            logger.error(f"Token exchange error: {token_data}")
            return RedirectResponse(
                url=f"{FRONTEND_URL}/gmail-import?error=token_exchange_failed"
            )

        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token", "")
        expires_in = token_data.get("expires_in", 3600)
        token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)
        user_id = state

        db = _get_db_session()
        try:
            existing = db.execute(
                text("SELECT id FROM gmail_tokens WHERE user_id = :uid"),
                {"uid": user_id}
            ).fetchone()

            if existing:
                db.execute(
                    text("UPDATE gmail_tokens SET access_token = :at, "
                         "refresh_token = :rt, token_expiry = :te, "
                         "is_connected = TRUE, updated_at = NOW() "
                         "WHERE user_id = :uid"),
                    {"at": access_token, "rt": refresh_token,
                     "te": token_expiry, "uid": user_id}
                )
            else:
                db.execute(
                    text("INSERT INTO gmail_tokens "
                         "(id, user_id, access_token, refresh_token, "
                         "token_expiry, is_connected, created_at, updated_at) "
                         "VALUES (:id, :uid, :at, :rt, :te, TRUE, NOW(), NOW())"),
                    {"id": str(uuid.uuid4()), "uid": user_id,
                     "at": access_token, "rt": refresh_token, "te": token_expiry}
                )
            db.commit()
            logger.info(f"Gmail connected for user {user_id}")
        except Exception as db_err:
            logger.error(f"DB error: {db_err}")
            db.rollback()
            db.execute(text("""
                CREATE TABLE IF NOT EXISTS gmail_tokens (
                    id UUID PRIMARY KEY,
                    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    access_token TEXT,
                    refresh_token TEXT,
                    token_expiry TIMESTAMP,
                    is_connected BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(user_id)
                )
            """))
            db.commit()
            db.execute(
                text("INSERT INTO gmail_tokens "
                     "(id, user_id, access_token, refresh_token, "
                     "token_expiry, is_connected, created_at, updated_at) "
                     "VALUES (:id, :uid, :at, :rt, :te, TRUE, NOW(), NOW())"),
                {"id": str(uuid.uuid4()), "uid": user_id,
                 "at": access_token, "rt": refresh_token, "te": token_expiry}
            )
            db.commit()
        finally:
            db.close()

        return RedirectResponse(url=f"{FRONTEND_URL}/gmail-import?connected=true")

    except Exception as e:
        logger.error(f"Gmail callback error: {e}")
        return RedirectResponse(url=f"{FRONTEND_URL}/gmail-import?error=server_error")


@router.get("/status")
def get_gmail_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check if Gmail is connected for current user."""
    try:
        result = db.execute(
            text("SELECT is_connected, updated_at "
                 "FROM gmail_tokens "
                 "WHERE user_id = :uid"),
            {"uid": str(current_user.id)}
        ).fetchone()

        if result and result.is_connected:
            return {
                "connected": True,
                "connected_at": str(result.updated_at)
            }
        return {"connected": False}
    except Exception:
        return {"connected": False}


@router.post("/fetch-transactions")
def fetch_transactions(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch bank transaction emails from Gmail."""
    try:
        service = get_gmail_service(
            str(current_user.id), db
        )
        if not service:
            raise HTTPException(
                status_code=401,
                detail="Gmail not connected. "
                       "Please connect Gmail first."
            )

        query = (
            f"(subject:debited OR subject:credited OR "
            f"subject:transaction OR subject:payment OR "
            f"subject:spent OR subject:UPI OR subject:NEFT "
            f"OR subject:IMPS OR subject:alert "
            f"OR from:alerts@hdfcbank.net "
            f"OR from:alerts@icicibank.com "
            f"OR from:sbi.co.in "
            f"OR from:axisbank.com) "
            f"newer_than:{days}d"
        )

        results = service.users().messages().list(
            userId='me',
            q=query,
            maxResults=50
        ).execute()

        messages = results.get('messages', [])
        transactions = []

        for msg in messages:
            try:
                message = service.users().messages().get(
                    userId='me',
                    id=msg['id'],
                    format='full'
                ).execute()

                headers = {
                    h['name']: h['value']
                    for h in message['payload']['headers']
                }
                subject = headers.get('Subject', '')
                date_str = headers.get('Date', '')
                sender = headers.get('From', '')

                body = ''
                payload = message['payload']
                if 'parts' in payload:
                    for part in payload['parts']:
                        if part['mimeType'] == 'text/plain':
                            data = part['body'].get('data', '')
                            if data:
                                body = base64.urlsafe_b64decode(
                                    data
                                ).decode('utf-8', errors='ignore')
                                break
                elif 'body' in payload:
                    data = payload['body'].get('data', '')
                    if data:
                        body = base64.urlsafe_b64decode(
                            data
                        ).decode('utf-8', errors='ignore')

                full_text = f"{subject} {body}"
                amount = parse_amount(full_text)

                if not amount or amount <= 0:
                    continue

                merchant = parse_merchant(full_text)
                trans_type = get_transaction_type(full_text)
                category = suggest_category(merchant, full_text)

                try:
                    from email.utils import parsedate_to_datetime
                    parsed_date = parsedate_to_datetime(date_str)
                    expense_date = parsed_date.strftime('%Y-%m-%d')
                except Exception:
                    expense_date = datetime.now().strftime(
                        '%Y-%m-%d'
                    )

                bank = 'Unknown Bank'
                if 'hdfc' in sender.lower():
                    bank = 'HDFC Bank'
                elif 'icici' in sender.lower():
                    bank = 'ICICI Bank'
                elif 'sbi' in sender.lower():
                    bank = 'State Bank of India'
                elif 'axis' in sender.lower():
                    bank = 'Axis Bank'
                elif 'kotak' in sender.lower():
                    bank = 'Kotak Bank'
                elif 'paytm' in sender.lower():
                    bank = 'Paytm'
                elif 'gpay' in sender.lower() or \
                     'google' in sender.lower():
                    bank = 'Google Pay'

                transactions.append({
                    'id': msg['id'],
                    'amount': amount,
                    'type': trans_type,
                    'merchant': merchant,
                    'date': expense_date,
                    'bank': bank,
                    'suggested_category': category,
                    'raw_subject': subject[:100],
                    'raw_snippet': message.get(
                        'snippet', ''
                    )[:150],
                    'selected': False,
                })

            except Exception as e:
                logger.warning(f"Error parsing email: {e}")
                continue

        transactions.sort(
            key=lambda x: x['date'], reverse=True
        )

        return {
            "transactions": transactions,
            "total": len(transactions),
            "days_searched": days,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fetch transactions error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch transactions: {str(e)}"
        )


@router.post("/import-transactions")
def import_transactions(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import selected transactions as expenses."""
    transactions = payload.get('transactions', [])
    imported = 0
    failed = 0

    for txn in transactions:
        try:
            category_result = db.execute(
                text("SELECT id FROM categories "
                     "WHERE name = :name "
                     "AND (user_id = :uid OR user_id IS NULL) "
                     "LIMIT 1"),
                {
                    "name": txn.get('category', 'Other'),
                    "uid": str(current_user.id)
                }
            ).fetchone()

            category_id = str(category_result.id) \
                if category_result else None

            db.execute(
                text("INSERT INTO expenses "
                     "(id, user_id, category_id, amount, "
                     "description, payment_method, "
                     "expense_date, is_recurring, "
                     "ai_category_suggestion, "
                     "created_at, updated_at) "
                     "VALUES (:id, :uid, :cid, :amt, "
                     ":desc, :pm, :date, FALSE, "
                     ":ai_cat, NOW(), NOW())"),
                {
                    "id": str(uuid.uuid4()),
                    "uid": str(current_user.id),
                    "cid": category_id,
                    "amt": float(txn.get('amount', 0)),
                    "desc": txn.get(
                        'merchant', 'Gmail Import'
                    )[:500],
                    "pm": txn.get('payment_method', 'upi'),
                    "date": txn.get(
                        'date',
                        datetime.now().strftime('%Y-%m-%d')
                    ),
                    "ai_cat": txn.get(
                        'suggested_category', 'Other'
                    ),
                }
            )
            imported += 1

        except Exception as e:
            logger.error(f"Import error for txn: {e}")
            failed += 1

    db.commit()
    return {
        "imported_count": imported,
        "failed_count": failed,
        "message": f"Successfully imported "
                   f"{imported} expenses"
    }


@router.delete("/disconnect")
def disconnect_gmail(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Disconnect Gmail for current user."""
    db.execute(
        text("UPDATE gmail_tokens SET is_connected = FALSE "
             "WHERE user_id = :uid"),
        {"uid": str(current_user.id)}
    )
    db.commit()
    return {"success": True, "message": "Gmail disconnected"}
