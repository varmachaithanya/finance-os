from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.gmail_token import GmailToken
from app.models.expense import Expense
from app.models.category import Category
from app.services.gmail_service import (
    get_auth_url,
    exchange_code_for_token,
    fetch_bank_emails,
)

router = APIRouter(prefix="/gmail", tags=["Gmail"])


@router.get("/auth-url")
def gmail_auth_url(current_user: User = Depends(get_current_user)) -> dict:
    url = get_auth_url(str(current_user.id))
    return {"auth_url": url}


@router.get("/callback")
def gmail_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
):
    try:
        exchange_code_for_token(code, state, db)
        html = """
<!DOCTYPE html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Gmail Connected</title>
<style>
body{margin:0;padding:0;background:#0B1120;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{background:#111E33;border:1px solid #1E2D45;border-radius:20px;padding:40px;text-align:center;max-width:400px}
h1{color:#F0F6FF;font-size:24px;margin:0 0 8px}
p{color:#4A6080;font-size:14px;margin:0 0 24px}
.btn{display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#00C9A7,#0EA5E9);color:#fff;text-decoration:none;border-radius:12px;font-weight:600}
</style>
</head><body>
<div class="card">
<h1>Gmail Connected! 🎉</h1>
<p>Your Gmail has been successfully linked. You can now import bank transactions.</p>
<a class="btn" href="/gmail-import">Go to Import</a>
</div>
<script>setTimeout(()=>{window.location.href='/gmail-import'},2000)</script>
</body></html>"""
        from starlette.responses import HTMLResponse
        return HTMLResponse(html)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to connect Gmail: {str(e)}")


@router.get("/status")
def gmail_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    token = db.query(GmailToken).filter(
        GmailToken.user_id == current_user.id,
        GmailToken.is_connected == True,
    ).first()
    if token:
        return {"connected": True, "email": ""}
    return {"connected": False, "email": None}


@router.post("/fetch-transactions")
def fetch_transactions(
    days: int = Query(30, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    try:
        transactions = fetch_bank_emails(str(current_user.id), days, db)
        cats = db.query(Category).filter(
            Category.type == "expense",
        ).all()
        cat_map = {}
        for c in cats:
            if c.name.lower() not in cat_map:
                cat_map[c.name.lower()] = str(c.id)

        result = []
        for txn in transactions:
            suggested_cat = txn.get("suggested_category")
            suggested_cat_id = cat_map.get(suggested_cat.lower()) if suggested_cat else None
            result.append({
                "id": f"txn_{len(result)}",
                "amount": txn["amount"],
                "type": txn["type"],
                "merchant": txn["merchant"],
                "date": txn["date"],
                "bank": txn["bank"],
                "suggested_category": suggested_cat,
                "suggested_category_id": suggested_cat_id,
                "raw_subject": txn["raw_subject"],
                "raw_snippet": txn["raw_snippet"],
                "selected": False,
            })

        return {"transactions": result, "total": len(result)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch transactions: {str(e)}")


class ImportTransactionItem:
    amount: float
    category_id: str
    description: str
    expense_date: str
    payment_method: str = "other"


@router.post("/import-transactions")
def import_transactions(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    items = body.get("transactions", [])
    if not items:
        raise HTTPException(status_code=400, detail="No transactions provided")

    imported = 0
    failed = 0
    for item in items:
        try:
            expense = Expense(
                user_id=current_user.id,
                category_id=item.get("category_id"),
                amount=Decimal(str(item.get("amount", 0))),
                description=item.get("description", ""),
                expense_date=datetime.strptime(item.get("expense_date", ""), "%Y-%m-%d").date(),
                payment_method=item.get("payment_method", "other"),
            )
            db.add(expense)
            imported += 1
        except Exception:
            failed += 1

    db.commit()
    return {"imported_count": imported, "failed_count": failed}


@router.delete("/disconnect")
def disconnect_gmail(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    token = db.query(GmailToken).filter(
        GmailToken.user_id == current_user.id,
    ).first()
    if token:
        token.is_connected = False
        token.access_token = None
        token.refresh_token = None
        db.commit()
    return {"message": "Gmail disconnected successfully"}
