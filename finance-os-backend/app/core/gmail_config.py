import os

GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
GMAIL_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GMAIL_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GMAIL_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    "https://financeos-api.up.railway.app/api/v1/gmail/callback",
)
