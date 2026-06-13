import logging
import smtplib
import uuid
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, formatdate

from app.core.config import settings

logger = logging.getLogger(__name__)

_FOOTER_TEXT = """---
Best Regards,

Chaithanya Varma
\u200b📍 Kompally, Hyderabad, Telangana - 500100"""

_FOOTER_HTML = """<tr><td style="padding-top:32px">
<hr style="border:none;border-top:1px solid #1E2D45;margin:0 0 24px 0">
</td></tr>
<tr><td style="text-align:center;padding-bottom:4px">
<p style="color:#8899AA;font-size:13px;margin:0;font-weight:600">Best Regards,</p>
</td></tr>
<tr><td style="text-align:center;padding-bottom:4px">
<p style="color:#C0CCD8;font-size:14px;margin:0">Chaithanya Varma</p>
</td></tr>
<tr><td style="text-align:center">
<p style="color:#4A6080;font-size:13px;margin:0">\u200b📍 Kompally, Hyderabad, Telangana - 500100</p>
</td></tr>"""


def _build_message(recipient: str, subject: str, html: str, text: str) -> str:
    msg = MIMEMultipart("alternative")
    msg["From"] = formataddr((settings.EMAIL_FROM_NAME, settings.EMAIL_FROM))
    msg["To"] = recipient
    msg["Subject"] = subject
    msg["Message-ID"] = f"<{uuid.uuid4().hex}@{settings.SMTP_HOST}>"
    msg["Date"] = formatdate(timeval=datetime.now(timezone.utc).timestamp(), localtime=False)
    msg["MIME-Version"] = "1.0"
    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))
    return msg.as_string()


def send_email(recipient: str, subject: str, html_body: str, text_body: str = "") -> None:
    host = settings.SMTP_HOST
    port = settings.SMTP_PORT
    user = settings.SMTP_USER
    password = settings.SMTP_PASSWORD
    text = text_body or _strip_html(html_body)
    try:
        with smtplib.SMTP(host, port, timeout=15) as server:
            server.ehlo()
            if user and password:
                server.starttls()
                server.ehlo()
                server.login(user, password)
            server.sendmail(
                settings.EMAIL_FROM,
                recipient,
                _build_message(recipient, subject, html_body, text),
            )
        logger.info("Email sent to %s via %s:%s: %s", recipient, host, port, subject)
    except Exception:
        logger.exception("Failed to send email to %s via %s:%s", recipient, host, port)


def _strip_html(html: str) -> str:
    import re
    text = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\n\s*\n", "\n\n", text)
    return text.strip()


def _with_footer(html: str, text: str) -> tuple[str, str]:
    html = html.replace(
        "</table>\n</td>\n</tr></table>",
        f"{_FOOTER_HTML}\n</table>\n</td>\n</tr></table>",
    )
    text = f"{text}\n{_FOOTER_TEXT}"
    return html, text


# ---------------------------------------------------------------------------
# Welcome email
# ---------------------------------------------------------------------------

def _welcome_text(full_name: str) -> str:
    return f"""Hi {full_name},

Welcome to WealthWise! Your finance dashboard is ready.

Track expenses, manage subscriptions, monitor credit cards, set budgets, and more — all in one place.

Go to Dashboard: {settings.FRONTEND_URL}/login

If you didn't create this account, please ignore this email."""


def _welcome_html(full_name: str) -> str:
    return f"""<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#0B1120;font-family:Inter,Arial,sans-serif">
<tr><td style="padding:40px 16px">
<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#111E33;border:1px solid #1E2D45;border-radius:16px;padding:40px">
<tr><td style="text-align:center;padding-bottom:24px">
<div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#00C9A7,#0EA5E9);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:700">W</div>
</td></tr>
<tr><td style="text-align:center;padding-bottom:8px">
<h1 style="color:#F0F6FF;font-size:22px;margin:0">Welcome, {full_name}!</h1>
</td></tr>
<tr><td style="text-align:center;padding-bottom:24px">
<p style="color:#4A6080;font-size:14px;margin:0">Your finance dashboard is ready.</p>
</td></tr>
<tr><td style="background:#0B1120;border:1px solid #1E2D45;border-radius:12px;padding:24px;margin-bottom:24px">
<p style="color:#F0F6FF;font-size:14px;line-height:1.6;margin:0">Track expenses, manage subscriptions, monitor credit cards, set budgets, and more — all in one place.</p>
</td></tr>
<tr><td style="text-align:center;padding-top:8px">
<a href="{settings.FRONTEND_URL}/login" style="display:inline-block;background:linear-gradient(135deg,#00C9A7,#0EA5E9);color:#fff;text-decoration:none;padding:12px 32px;border-radius:12px;font-size:14px;font-weight:600">Go to Dashboard</a>
</td></tr>
<tr><td style="text-align:center;padding-top:32px">
<p style="color:#4A6080;font-size:12px;margin:0">If you didn't create this account, please ignore this email.</p>
</td></tr>
</table>
</td></tr></table>"""


def send_welcome_email(recipient: str, full_name: str) -> None:
    html, text = _with_footer(_welcome_html(full_name), _welcome_text(full_name))
    send_email(recipient, "Welcome to WealthWise!", html, text)


# ---------------------------------------------------------------------------
# Login notification
# ---------------------------------------------------------------------------

def _login_notification_text(full_name: str) -> str:
    return f"""Hi {full_name},

A new sign-in was detected on your WealthWise account.

If this was you, no action is needed. If you didn't sign in, please change your password immediately.

Change Password: {settings.FRONTEND_URL}/change-password"""


def _login_notification_html(full_name: str) -> str:
    return f"""<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#0B1120;font-family:Inter,Arial,sans-serif">
<tr><td style="padding:40px 16px">
<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#111E33;border:1px solid #1E2D45;border-radius:16px;padding:40px">
<tr><td style="text-align:center;padding-bottom:24px">
<div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#00C9A7,#0EA5E9);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:700">W</div>
</td></tr>
<tr><td style="text-align:center;padding-bottom:8px">
<h1 style="color:#F0F6FF;font-size:20px;margin:0">Hi {full_name}!</h1>
</td></tr>
<tr><td style="text-align:center;padding-bottom:24px">
<p style="color:#4A6080;font-size:14px;margin:0">A new sign-in was detected on your WealthWise account.</p>
</td></tr>
<tr><td style="background:#0B1120;border:1px solid #1E2D45;border-radius:12px;padding:24px;margin-bottom:24px">
<p style="color:#F0F6FF;font-size:14px;line-height:1.6;margin:0">If this was you, no action is needed. If you didn't sign in, please change your password immediately.</p>
</td></tr>
<tr><td style="text-align:center;padding-top:8px">
<a href="{settings.FRONTEND_URL}/change-password" style="display:inline-block;background:linear-gradient(135deg,#00C9A7,#0EA5E9);color:#fff;text-decoration:none;padding:12px 32px;border-radius:12px;font-size:14px;font-weight:600">Change Password</a>
</td></tr>
</table>
</td></tr></table>"""


def send_login_notification(recipient: str, full_name: str) -> None:
    html, text = _with_footer(_login_notification_html(full_name), _login_notification_text(full_name))
    send_email(recipient, "New sign-in to your WealthWise account", html, text)


# ---------------------------------------------------------------------------
# Password reset
# ---------------------------------------------------------------------------

def _password_reset_text(full_name: str, token: str) -> str:
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    return f"""Hi {full_name},

Click the link below to reset your password. This link expires in 15 minutes.

{reset_link}

If you didn't request this, please ignore this email."""


def _password_reset_html(full_name: str, token: str) -> str:
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    return f"""<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#0B1120;font-family:Inter,Arial,sans-serif">
<tr><td style="padding:40px 16px">
<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#111E33;border:1px solid #1E2D45;border-radius:16px;padding:40px">
<tr><td style="text-align:center;padding-bottom:24px">
<div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#00C9A7,#0EA5E9);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:700">W</div>
</td></tr>
<tr><td style="text-align:center;padding-bottom:8px">
<h1 style="color:#F0F6FF;font-size:20px;margin:0">Reset your password</h1>
</td></tr>
<tr><td style="text-align:center;padding-bottom:24px">
<p style="color:#4A6080;font-size:14px;margin:0">Click the button below to reset your password. This link expires in 15 minutes.</p>
</td></tr>
<tr><td style="text-align:center;padding-bottom:24px">
<a href="{reset_link}" style="display:inline-block;background:linear-gradient(135deg,#00C9A7,#0EA5E9);color:#fff;text-decoration:none;padding:12px 32px;border-radius:12px;font-size:14px;font-weight:600">Reset Password</a>
</td></tr>
<tr><td style="text-align:center;padding-bottom:8px">
<p style="color:#4A6080;font-size:13px;margin:0">Or copy this link into your browser:</p>
</td></tr>
<tr><td style="background:#0B1120;border:1px solid #1E2D45;border-radius:8px;padding:12px;text-align:center;word-break:break-all">
<code style="color:#00C9A7;font-size:12px">{reset_link}</code>
</td></tr>
<tr><td style="text-align:center;padding-top:24px">
<p style="color:#4A6080;font-size:12px;margin:0">If you didn't request this, please ignore this email.</p>
</td></tr>
</table>
</td></tr></table>"""


def send_password_reset_email(recipient: str, full_name: str, token: str) -> None:
    html, text = _with_footer(_password_reset_html(full_name, token), _password_reset_text(full_name, token))
    send_email(recipient, "Reset your WealthWise password", html, text)


# ---------------------------------------------------------------------------
# Credit card due reminder
# ---------------------------------------------------------------------------

def _cc_due_text(bank_name: str, card_name: str, minimum_due: str, due_date: str, days_left: int) -> str:
    return f"""Hi,

This is a reminder that your credit card payment is due in {days_left} days.

Card: {bank_name} - {card_name}
Minimum Due: \u20b9{minimum_due}
Due Date: {due_date}

Please ensure timely payment to avoid late fees."""


def _cc_due_html(bank_name: str, card_name: str, minimum_due: str, due_date: str, days_left: int) -> str:
    return f"""<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#0B1120;font-family:Inter,Arial,sans-serif">
<tr><td style="padding:40px 16px">
<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#111E33;border:1px solid #1E2D45;border-radius:16px;padding:40px">
<tr><td style="text-align:center;padding-bottom:24px">
<div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#00C9A7,#0EA5E9);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:700">W</div>
</td></tr>
<tr><td style="text-align:center;padding-bottom:8px">
<h1 style="color:#F0F6FF;font-size:20px;margin:0">Credit Card Due Reminder</h1>
</td></tr>
<tr><td style="text-align:center;padding-bottom:24px">
<p style="color:#FF6B6B;font-size:14px;margin:0">Your payment is due in {days_left} day{"s" if days_left != 1 else ""}</p>
</td></tr>
<tr><td style="background:#0B1120;border:1px solid #1E2D45;border-radius:12px;padding:24px;margin-bottom:24px">
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">
<tr><td style="color:#4A6080;font-size:13px;padding-bottom:8px">Card</td>
<td style="color:#F0F6FF;font-size:14px;text-align:right;padding-bottom:8px">{bank_name} - {card_name}</td></tr>
<tr><td style="color:#4A6080;font-size:13px;padding-bottom:8px">Minimum Due</td>
<td style="color:#F0F6FF;font-size:14px;text-align:right;padding-bottom:8px">\u20b9{minimum_due}</td></tr>
<tr><td style="color:#4A6080;font-size:13px;padding-bottom:8px">Due Date</td>
<td style="color:#F0F6FF;font-size:14px;text-align:right;padding-bottom:8px">{due_date}</td></tr>
</table>
</td></tr>
<tr><td style="text-align:center;padding-top:8px">
<p style="color:#4A6080;font-size:12px;margin:0">Please ensure timely payment to avoid late fees.</p>
</td></tr>
</table>
</td></tr></table>"""


def send_cc_due_reminder(recipient: str, bank_name: str, card_name: str, minimum_due: str, due_date: str, days_left: int) -> None:
    subject = f"Credit Card Due in {days_left} day{'s' if days_left != 1 else ''} — {bank_name} {card_name}"
    html, text = _with_footer(
        _cc_due_html(bank_name, card_name, minimum_due, due_date, days_left),
        _cc_due_text(bank_name, card_name, minimum_due, due_date, days_left),
    )
    send_email(recipient, subject, html, text)


# ---------------------------------------------------------------------------
# Subscription renewal notification
# ---------------------------------------------------------------------------

def _renewal_text(service_name: str, amount: str, renewal_date: str, days_left: int) -> str:
    return f"""Hi,

Your subscription for {service_name} of \u20b9{amount} will renew in {days_left} days.

Renewal Date: {renewal_date}

Please review your subscription to avoid unexpected charges."""


def _renewal_html(service_name: str, amount: str, renewal_date: str, days_left: int) -> str:
    return f"""<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#0B1120;font-family:Inter,Arial,sans-serif">
<tr><td style="padding:40px 16px">
<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#111E33;border:1px solid #1E2D45;border-radius:16px;padding:40px">
<tr><td style="text-align:center;padding-bottom:24px">
<div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#00C9A7,#0EA5E9);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:700">W</div>
</td></tr>
<tr><td style="text-align:center;padding-bottom:8px">
<h1 style="color:#F0F6FF;font-size:20px;margin:0">Upcoming Subscription Renewal</h1>
</td></tr>
<tr><td style="text-align:center;padding-bottom:24px">
<p style="color:#4A6080;font-size:14px;margin:0">Your subscription renews in {days_left} day{"s" if days_left != 1 else ""}</p>
</td></tr>
<tr><td style="background:#0B1120;border:1px solid #1E2D45;border-radius:12px;padding:24px;margin-bottom:24px">
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">
<tr><td style="color:#4A6080;font-size:13px;padding-bottom:8px">Service</td>
<td style="color:#F0F6FF;font-size:14px;text-align:right;padding-bottom:8px">{service_name}</td></tr>
<tr><td style="color:#4A6080;font-size:13px;padding-bottom:8px">Amount</td>
<td style="color:#F0F6FF;font-size:14px;text-align:right;padding-bottom:8px">\u20b9{amount}</td></tr>
<tr><td style="color:#4A6080;font-size:13px;padding-bottom:8px">Renewal Date</td>
<td style="color:#F0F6FF;font-size:14px;text-align:right;padding-bottom:8px">{renewal_date}</td></tr>
</table>
</td></tr>
<tr><td style="text-align:center;padding-top:8px">
<p style="color:#4A6080;font-size:12px;margin:0">Please review your subscription to avoid unexpected charges.</p>
</td></tr>
</table>
</td></tr></table>"""


def send_subscription_renewal_notification(recipient: str, service_name: str, amount: str, renewal_date: str, days_left: int) -> None:
    subject = f"Subscription Renewal in {days_left} day{'s' if days_left != 1 else ''} — {service_name}"
    html, text = _with_footer(
        _renewal_html(service_name, amount, renewal_date, days_left),
        _renewal_text(service_name, amount, renewal_date, days_left),
    )
    send_email(recipient, subject, html, text)


# ---------------------------------------------------------------------------
# Budget alert
# ---------------------------------------------------------------------------

def _budget_alert_text(category_name: str, spent: str, budget_amount: str, pct: float) -> str:
    return f"""Hi,

Budget Alert: {category_name}

You've used {pct:.1f}% of your {category_name} budget.

Spent: \u20b9{spent}
Budget: \u20b9{budget_amount}

Please review your spending for this category."""


def _budget_alert_html(category_name: str, spent: str, budget_amount: str, pct: float) -> str:
    bar_pct = min(pct, 100)
    bar_color = "#FF6B6B" if pct >= 100 else ("#F59E0B" if pct >= 80 else "#00C9A7")
    return f"""<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#0B1120;font-family:Inter,Arial,sans-serif">
<tr><td style="padding:40px 16px">
<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#111E33;border:1px solid #1E2D45;border-radius:16px;padding:40px">
<tr><td style="text-align:center;padding-bottom:24px">
<div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#00C9A7,#0EA5E9);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:700">W</div>
</td></tr>
<tr><td style="text-align:center;padding-bottom:8px">
<h1 style="color:#F0F6FF;font-size:20px;margin:0">Budget Alert: {category_name}</h1>
</td></tr>
<tr><td style="text-align:center;padding-bottom:24px">
<p style="color: {bar_color}; font-size: 28px; font-weight: 700; margin:0">{pct:.1f}%</p>
<p style="color:#4A6080;font-size:13px;margin:0">of budget used</p>
</td></tr>
<tr><td style="padding-bottom:24px">
<div style="background:#1E2D45;border-radius:8px;height:10px;overflow:hidden">
<div style="width:{bar_pct}%;background:{bar_color};height:10px;border-radius:8px"></div>
</div>
</td></tr>
<tr><td style="background:#0B1120;border:1px solid #1E2D45;border-radius:12px;padding:24px;margin-bottom:24px">
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">
<tr><td style="color:#4A6080;font-size:13px;padding-bottom:8px">Spent</td>
<td style="color:#F0F6FF;font-size:14px;text-align:right;padding-bottom:8px">\u20b9{spent}</td></tr>
<tr><td style="color:#4A6080;font-size:13px;padding-bottom:8px">Budget</td>
<td style="color:#F0F6FF;font-size:14px;text-align:right;padding-bottom:8px">\u20b9{budget_amount}</td></tr>
</table>
</td></tr>
<tr><td style="text-align:center;padding-top:8px">
<p style="color:#4A6080;font-size:12px;margin:0">Please review your spending for this category.</p>
</td></tr>
</table>
</td></tr></table>"""


def send_budget_alert(recipient: str, category_name: str, spent: str, budget_amount: str, pct: float) -> None:
    subject = f"Budget Alert: {category_name} — {pct:.1f}% used"
    html, text = _with_footer(
        _budget_alert_html(category_name, spent, budget_amount, pct),
        _budget_alert_text(category_name, spent, budget_amount, pct),
    )
    send_email(recipient, subject, html, text)
