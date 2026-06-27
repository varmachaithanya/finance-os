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


def get_transaction_type(text_content: str) -> str:
    """Determine if transaction is debit or credit."""
    text_lower = text_content.lower()
    debit_words = ['debited', 'debit', 'spent', 'paid',
                   'payment', 'purchase', 'withdrawn',
                   'transferred', 'sent']
    credit_words = ['credited', 'credit', 'received',
                    'deposited', 'refund', 'cashback']
    for word in credit_words:
        if word in text_lower:
            return 'credit'
    for word in debit_words:
        if word in text_lower:
            return 'debit'
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


def detect_bank(sender: str, subject: str, body: str) -> str:
    """Detect bank from email sender and content."""
    sender_lower = sender.lower()
    content_lower = f"{subject} {body[:200]}".lower()

    bank_patterns = {
        'HDFC Bank': ['hdfc', 'hdfcbank'],
        'ICICI Bank': ['icici', 'icicidirect'],
        'State Bank of India': ['sbi', 'onlinesbi', 'sbicard'],
        'Axis Bank': ['axisbank', 'axis bank'],
        'Kotak Mahindra Bank': ['kotak', 'kotakbank'],
        'IndusInd Bank': ['indusind'],
        'Yes Bank': ['yesbank', 'yes bank'],
        'IDFC First Bank': ['idfcfirst', 'idfc'],
        'Federal Bank': ['federalbank', 'federal bank'],
        'RBL Bank': ['rblbank', 'rbl bank'],
        'Paytm Payments Bank': ['paytmbank', 'paytm bank'],
        'AU Small Finance Bank': ['aupayments', 'aubank'],
    }

    for bank_name, keywords in bank_patterns.items():
        if any(kw in sender_lower for kw in keywords):
            return bank_name
        if any(kw in content_lower for kw in keywords):
            return bank_name

    return 'Bank Transaction'


def is_valid_transaction(amount: float, merchant: str, subject: str, body: str) -> bool:
    """Return True only if this is a real bank transaction, not OTP/promotional email."""
    combined = f"{subject} {body}".lower()

    if not amount or amount <= 0:
        return False
    if amount < 1 or amount > 10000000:
        return False

    transaction_keywords = [
        'debited', 'credited', 'transaction',
        'transferred', 'payment', 'spent',
        'purchase', 'withdrawn', 'deposit',
        'neft', 'imps', 'rtgs', 'upi'
    ]
    has_txn_keyword = any(kw in combined for kw in transaction_keywords)
    if not has_txn_keyword:
        return False

    otp_patterns = [
        'otp', 'one time password',
        'verification code', 'do not share',
        'never share', 'expires in'
    ]
    if any(p in combined for p in otp_patterns):
        return False

    promo_patterns = [
        'offer', 'cashback offer',
        'exciting offer', 'special offer',
        'limited time', 'click here to',
        'unsubscribe', 'terms and conditions apply'
    ]
    if sum(1 for p in promo_patterns if p in combined) >= 2:
        return False

    return True


def extract_email_body(payload: dict) -> str:
    """Recursively extract text from Gmail message payload."""
    mime_type = payload.get('mimeType', '')
    body_data = payload.get('body', {}).get('data', '')

    if mime_type == 'text/plain' and body_data:
        return base64.urlsafe_b64decode(body_data).decode('utf-8', errors='ignore')

    if mime_type == 'text/html' and body_data:
        html = base64.urlsafe_b64decode(body_data).decode('utf-8', errors='ignore')
        return re.sub(r'<[^>]+>', ' ', html)

    parts = payload.get('parts', [])
    for part in parts:
        result = extract_email_body(part)
        if result:
            return result

    return ''


def parse_amount(text_content: str) -> Optional[float]:
    """Extract amount from email text - supports Indian financial formats."""
    patterns = [
        r'(?:Rs|INR|₹)\s*([0-9,]+(?:\.[0-9]{2})?)',
        r'([0-9,]+(?:\.[0-9]{2})?)\s*(?:Rs|INR|₹)',
        r'(?:amount|amt|value|total)\s*(?:Rs|INR|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)',
        r'(?:Rs|INR|₹)\s*([0-9]+)',
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, text_content, re.IGNORECASE):
            amount_str = match.group(1).replace(',', '')
            try:
                val = float(amount_str)
                if 1 <= val <= 9999999:
                    return val
            except ValueError:
                continue
    return None


def parse_merchant(text_content: str, subject: str = "") -> str:
    """Extract merchant name accurately from email."""
    combined = f"{subject} {text_content}"
    patterns = [
        r'\bat\s+([A-Za-z0-9][A-Za-z0-9\s\-&\.\']+?)(?:\s+on\s|\s+via\s|\s+for\s|\s+dated|\s+\d{2}[\/\-]|\.|,|\busing\b|\bthrough\b)',
        r'\bto\s+([A-Za-z][A-Za-z0-9\s\-&\.]+?)(?:\s+on\s|\s+via\s|\s+for\s|\s+dated|\s+\d{2}[\/\-]|\.|,)',
        r'merchant[:\s]+([A-Za-z0-9][A-Za-z0-9\s\-&\.]+?)(?:\s+on\s|\s+\d|\.|,|$)',
        r'Info[:\s]+([A-Za-z0-9][A-Za-z0-9\s\-&\.@]+?)(?:\s+on\s|\s+\d|\.|,|$)',
    ]
    for pattern in patterns:
        match = re.search(pattern, combined, re.IGNORECASE)
        if match:
            merchant = match.group(1).strip()
            merchant = re.sub(r'\s+', ' ', merchant)
            merchant = re.sub(r'\s+(via|using|through|with)$', '', merchant, flags=re.IGNORECASE)
            if len(merchant) >= 3 and not merchant.replace(' ', '').isdigit():
                return merchant[:60]
    upi_match = re.search(r'([a-zA-Z0-9.\-_]+@[a-zA-Z]+)', combined)
    if upi_match:
        name = upi_match.group(1).split('@')[0]
        if len(name) >= 3:
            return name[:60]
    return "Bank Transaction"


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
    incremental: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch bank transaction emails from Gmail with strict filtering and incremental support."""
    try:
        service = get_gmail_service(str(current_user.id), db)
        if not service:
            raise HTTPException(
                status_code=401,
                detail="Gmail not connected. Please connect Gmail first."
            )

        # Incremental fetch: only emails after last_fetched_at
        is_incremental = False
        token_row = None
        try:
            token_row = db.execute(
                text("SELECT last_fetched_at FROM gmail_tokens "
                     "WHERE user_id = :uid AND is_connected = TRUE"),
                {"uid": str(current_user.id)}
            ).fetchone()
            is_incremental = bool(incremental and token_row and token_row.last_fetched_at)
        except Exception:
            logger.info("last_fetched_at column not available, falling back to full fetch")
        if is_incremental:
            last_fetch = token_row.last_fetched_at
            if hasattr(last_fetch, 'timestamp'):
                after_timestamp = int(last_fetch.timestamp())
            else:
                after_timestamp = int(last_fetch.replace(tzinfo=None).timestamp())
            query_time_filter = f"after:{after_timestamp}"
        else:
            query_time_filter = f"newer_than:{days}d"

        # Stricter query: only known Indian bank sender domains + transaction subject keywords
        query = (
            "(from:alerts@hdfcbank.net "
            "OR from:phishingalerts@hdfcbank.com "
            "OR from:alerts@icicibank.com "
            "OR from:onlinesbi@sbi.co.in "
            "OR from:sbicard@sbicard.com "
            "OR from:alerts@axisbank.com "
            "OR from:noreply@axisbank.com "
            "OR from:alerts@kotakbank.com "
            "OR from:noreply@kotak.com "
            "OR from:alerts@indusind.com "
            "OR from:noreply@yesbank.in "
            "OR from:noreply@idfcfirstbank.com "
            "OR from:alerts@federalbank.co.in "
            "OR from:noreply@rblbank.com "
            "OR from:care@paytmbank.com "
            "OR from:noreply@aupayments.com) "
            "AND (subject:debited OR subject:credited "
            "OR subject:\"transaction alert\" "
            "OR subject:\"a/c\" "
            "OR subject:\"acct\" "
            "OR subject:spent OR subject:\"UPI txn\" "
            "OR subject:NEFT OR subject:IMPS "
            "OR subject:RTGS) "
            f"{query_time_filter}"
        )

        logger.info("Fetching Gmail messages", query=query, days=days, incremental=is_incremental)

        # ---- Paginated fetch (max 3 pages) ----
        all_messages = []
        page_token = None
        page_num = 0
        while page_num < 3:
            page_num += 1
            result = service.users().messages().list(
                userId='me',
                q=query,
                maxResults=500,
                pageToken=page_token,
            ).execute()

            batch = result.get('messages', [])
            all_messages.extend(batch)

            page_token = result.get('nextPageToken')
            logger.info("Gmail page fetched", page=page_num, batch_size=len(batch),
                        total_so_far=len(all_messages), has_next_page=bool(page_token))

            if not page_token:
                break

        total_found = len(all_messages)
        logger.info("Gmail fetch complete", total_messages_found=total_found)

        # ---- Process each message ----
        transactions = []
        skipped_no_amount = 0
        skipped_invalid = 0
        skipped_error = 0
        parsed_ok = 0

        for msg in all_messages:
            try:
                message = service.users().messages().get(
                    userId='me', id=msg['id'], format='full'
                ).execute()

                headers = {h['name']: h['value'] for h in message['payload']['headers']}
                subject = headers.get('Subject', '')
                date_str = headers.get('Date', '')
                sender = headers.get('From', '')

                body = extract_email_body(message['payload'])
                full_text = f"{subject}\n{body}"
                amount = parse_amount(full_text)

                if not amount or amount <= 0:
                    skipped_no_amount += 1
                    continue

                merchant = parse_merchant(full_text, subject)
                trans_type = get_transaction_type(full_text)
                category = suggest_category(merchant, full_text)
                bank = detect_bank(sender, subject, body)

                if not is_valid_transaction(amount, merchant, subject, body):
                    skipped_invalid += 1
                    continue

                try:
                    from email.utils import parsedate_to_datetime
                    parsed_date = parsedate_to_datetime(date_str)
                    expense_date = parsed_date.strftime('%Y-%m-%d')
                except Exception:
                    expense_date = datetime.now().strftime('%Y-%m-%d')

                transactions.append({
                    'id': msg['id'],
                    'amount': amount,
                    'type': trans_type,
                    'merchant': merchant,
                    'date': expense_date,
                    'bank': bank,
                    'suggested_category': category,
                    'payment_method': 'upi',
                    'raw_subject': subject[:150] if subject else '',
                    'raw_snippet': message.get('snippet', '')[:200],
                    'selected': False,
                })
                parsed_ok += 1

            except Exception as e:
                logger.warning("Error parsing individual email", error=str(e), msg_id=msg.get('id'))
                skipped_error += 1
                continue

        transactions.sort(key=lambda x: x['date'], reverse=True)

        # Update last_fetched_at
        try:
            db.execute(
                text("UPDATE gmail_tokens SET last_fetched_at = NOW() "
                     "WHERE user_id = :uid"),
                {"uid": str(current_user.id)}
            )
            db.commit()
        except Exception:
            db.rollback()
            logger.info("last_fetched_at column not available, skipping update")

        logger.info("Transaction extraction summary", total_found=total_found,
                    parsed_ok=parsed_ok, skipped_no_amount=skipped_no_amount,
                    skipped_invalid=skipped_invalid, skipped_error=skipped_error,
                    total_returned=len(transactions))

        return {
            "transactions": transactions,
            "total": len(transactions),
            "total_found": total_found,
            "parsed_ok": parsed_ok,
            "skipped_no_amount": skipped_no_amount,
            "skipped_invalid": skipped_invalid,
            "skipped_error": skipped_error,
            "days_searched": days,
            "is_incremental": is_incremental,
            "fetched_at": datetime.utcnow().isoformat(),
            "last_fetch_was": str(token_row.last_fetched_at) if token_row and token_row.last_fetched_at else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Fetch transactions error", error=str(e))
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
    """Import selected transactions as expenses with duplicate detection."""
    transactions = payload.get('transactions', [])
    imported = 0
    duplicates = 0
    failed = 0

    for txn in transactions:
        try:
            amount = float(txn.get('amount', 0))
            expense_date = txn.get('expense_date') or txn.get(
                'date', datetime.now().strftime('%Y-%m-%d')
            )
            description = txn.get('description') or txn.get('merchant', 'Gmail Import')[:500]
            suggested_category = txn.get(
                'suggested_category', 'Other'
            )

            existing = db.execute(
                text("SELECT id FROM expenses "
                     "WHERE user_id = :uid "
                     "AND amount = :amt "
                     "AND expense_date = :date "
                     "AND description = :desc "
                     "LIMIT 1"),
                {
                    "uid": str(current_user.id),
                    "amt": amount,
                    "date": expense_date,
                    "desc": description,
                }
            ).fetchone()

            if existing:
                duplicates += 1
                continue

            cat_name = txn.get('suggested_category') or txn.get('category') or 'Other'
            category_result = db.execute(
                text("SELECT id FROM categories "
                     "WHERE name = :name "
                     "AND (user_id = :uid OR user_id IS NULL) "
                     "LIMIT 1"),
                {
                    "name": cat_name,
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
                    "amt": amount,
                    "desc": description,
                    "pm": txn.get('payment_method', 'upi'),
                    "date": expense_date,
                    "ai_cat": suggested_category,
                }
            )
            imported += 1

        except Exception as e:
            logger.error(f"Import error for txn: {e}")
            failed += 1

    db.commit()

    logger.info(
        "Import complete",
        total_attempted=len(transactions),
        imported=imported,
        duplicates=duplicates,
        failed=failed,
    )

    return {
        "imported_count": imported,
        "duplicate_count": duplicates,
        "failed_count": failed,
        "message": f"Imported {imported} expenses"
                   + (f", {duplicates} duplicates skipped" if duplicates else "")
                   + (f", {failed} failed" if failed else ""),
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
