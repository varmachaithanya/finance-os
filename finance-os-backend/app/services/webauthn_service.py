import base64
import hashlib
import json
import logging
import secrets
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token
from app.models.user import User
from app.models.webauthn import WebAuthnChallenge, WebAuthnCredential
from app.repositories.user_repository import UserRepository

logger = logging.getLogger(__name__)

TIMEOUT_MS = 60000


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(s: str) -> bytes:
    s += "=" * (4 - len(s) % 4)
    return base64.urlsafe_b64decode(s)


def _generate_challenge() -> str:
    return _b64url(secrets.token_bytes(32))


class WebAuthnService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)

    def begin_registration(self, user_id: str) -> dict:
        user = self.user_repo.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        challenge = _generate_challenge()
        self.db.add(WebAuthnChallenge(user_id=user.id, challenge=challenge, purpose="register"))
        self.db.commit()

        return {
            "challenge": challenge,
            "rp": {"name": settings.WEBAUTHN_RP_NAME, "id": settings.WEBAUTHN_RP_ID},
            "user": {
                "id": _b64url(str(user.id).encode()),
                "name": user.email,
                "displayName": user.full_name,
            },
            "pubKeyCredParams": [{"type": "public-key", "alg": -7}],
            "authenticatorSelection": {
                "residentKey": "preferred",
                "userVerification": "preferred",
            },
            "attestation": "none",
            "timeout": TIMEOUT_MS,
        }

    def complete_registration(
        self,
        user_id: str,
        credential_id: str,
        raw_id: str,
        client_data_json: str,
        attestation_object: str,
        device_name: Optional[str] = None,
    ) -> dict:
        user = self.user_repo.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        challenge_record = (
            self.db.query(WebAuthnChallenge)
            .filter(
                WebAuthnChallenge.user_id == user.id,
                WebAuthnChallenge.purpose == "register",
            )
            .order_by(WebAuthnChallenge.created_at.desc())
            .first()
        )
        if not challenge_record:
            raise HTTPException(status_code=400, detail="No registration challenge found")

        try:
            cdj_bytes = _b64url_decode(client_data_json)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid client data JSON encoding: {e}")
        try:
            cdj = json.loads(cdj_bytes.decode())
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid client data JSON: {e}")
        if cdj.get("type") != "webauthn.create":
            raise HTTPException(status_code=400, detail="Invalid client data type")
        if cdj.get("challenge") != challenge_record.challenge:
            raise HTTPException(status_code=400, detail="Challenge mismatch")
        if cdj.get("origin") != settings.WEBAUTHN_ORIGIN:
            raise HTTPException(status_code=400, detail="Origin mismatch")

        att_obj_bytes = _b64url_decode(attestation_object)
        logger.debug(
            "complete_registration: attestation_object length=%d, cdj length=%d",
            len(att_obj_bytes), len(client_data_json),
        )
        att_obj = _decode_cbor(att_obj_bytes)
        auth_data = att_obj.get("authData", b"")
        if not auth_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="authData missing from attestation object",
            )
        public_key_bytes = _extract_public_key_from_auth_data(auth_data)
        if not public_key_bytes:
            raise HTTPException(status_code=400, detail="Could not extract public key from attestation")

        self.db.delete(challenge_record)

        existing = (
            self.db.query(WebAuthnCredential)
            .filter(WebAuthnCredential.credential_id == credential_id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="Credential already registered")

        cred = WebAuthnCredential(
            user_id=user.id,
            credential_id=credential_id,
            public_key=public_key_bytes.decode("ascii"),
            device_name=device_name or "Biometric",
        )
        self.db.add(cred)
        self.db.commit()

        return {"status": "ok", "credential_id": credential_id}

    def begin_login(self, email: str) -> dict:
        user = self.user_repo.get_by_email(email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        credentials = (
            self.db.query(WebAuthnCredential)
            .filter(WebAuthnCredential.user_id == user.id)
            .all()
        )
        if not credentials:
            raise HTTPException(status_code=404, detail="No biometric credentials registered")

        challenge = _generate_challenge()
        self.db.add(WebAuthnChallenge(user_id=user.id, challenge=challenge, purpose="login"))
        self.db.commit()

        return {
            "challenge": challenge,
            "rp_id": settings.WEBAUTHN_RP_ID,
            "allowCredentials": [
                {
                    "type": "public-key",
                    "id": cred.credential_id,
                }
                for cred in credentials
            ],
            "timeout": TIMEOUT_MS,
            "user_verified": True,
        }

    def complete_login(
        self,
        email: str,
        credential_id: str,
        client_data_json: str,
        authenticator_data: str,
        signature: str,
    ) -> dict:
        user = self.user_repo.get_by_email(email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        challenge_record = (
            self.db.query(WebAuthnChallenge)
            .filter(
                WebAuthnChallenge.user_id == user.id,
                WebAuthnChallenge.purpose == "login",
            )
            .order_by(WebAuthnChallenge.created_at.desc())
            .first()
        )
        if not challenge_record:
            raise HTTPException(status_code=400, detail="No login challenge found")

        cdj = json.loads(_b64url_decode(client_data_json).decode())
        if cdj.get("type") != "webauthn.get":
            raise HTTPException(status_code=400, detail="Invalid client data type")
        if cdj.get("challenge") != challenge_record.challenge:
            raise HTTPException(status_code=400, detail="Challenge mismatch")
        if cdj.get("origin") != settings.WEBAUTHN_ORIGIN:
            raise HTTPException(status_code=400, detail="Origin mismatch")

        self.db.delete(challenge_record)

        cred = (
            self.db.query(WebAuthnCredential)
            .filter(
                WebAuthnCredential.user_id == user.id,
                WebAuthnCredential.credential_id == credential_id,
            )
            .first()
        )
        if not cred:
            raise HTTPException(status_code=400, detail="Credential not found")

        auth_data_bytes = _b64url_decode(authenticator_data)
        sig_bytes = _b64url_decode(signature)
        client_data_hash = hashlib.sha256(_b64url_decode(client_data_json)).digest()
        signed_data = auth_data_bytes + client_data_hash

        public_key_pem = _decode_public_key_pem(cred.public_key)
        if public_key_pem is None:
            raise HTTPException(status_code=500, detail="Invalid stored public key")

        try:
            from cryptography.exceptions import InvalidSignature
            from cryptography.hazmat.primitives import hashes, serialization
            from cryptography.hazmat.primitives.asymmetric import ec
            public_key = serialization.load_pem_public_key(public_key_pem)
            if isinstance(public_key, ec.EllipticCurvePublicKey):
                public_key.verify(sig_bytes, signed_data, ec.ECDSA(hashes.SHA256()))
            else:
                raise HTTPException(status_code=400, detail="Unsupported key type")
        except ImportError:
            raise HTTPException(status_code=500, detail="Cryptography library not available")
        except InvalidSignature:
            raise HTTPException(status_code=400, detail="Invalid signature")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Verification failed: {str(e)}")

        cred.sign_count += 1
        self.db.commit()

        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
        }

    def get_credentials(self, user_id: str) -> list[dict]:
        creds = (
            self.db.query(WebAuthnCredential)
            .filter(WebAuthnCredential.user_id == user_id)
            .all()
        )
        return [
            {
                "id": str(c.id),
                "credential_id": c.credential_id,
                "device_name": c.device_name,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in creds
        ]

    def delete_credential(self, user_id: str, credential_id: str) -> None:
        cred = (
            self.db.query(WebAuthnCredential)
            .filter(
                WebAuthnCredential.user_id == user_id,
                WebAuthnCredential.id == credential_id,
            )
            .first()
        )
        if not cred:
            raise HTTPException(status_code=404, detail="Credential not found")
        self.db.delete(cred)
        self.db.commit()


def _decode_cbor(data: bytes) -> dict:
    import cbor2
    logger.debug("CBOR decode: data length=%d, hex[:50]=%s", len(data), data[:50].hex())
    try:
        return cbor2.loads(data)
    except Exception as e:
        logger.error("CBOR decode failure: %s, length=%d, data[:50]=%s", e, len(data), data[:50].hex())
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid attestation data: {e}",
        )


def _extract_public_key_from_auth_data(auth_data: bytes) -> Optional[str]:
    logger.debug(
        "extract_public_key: auth_data length=%d, hex[:50]=%s",
        len(auth_data), auth_data[:50].hex(),
    )

    if len(auth_data) < 37:
        logger.warning("auth_data too short: %d bytes", len(auth_data))
        return None

    flags = auth_data[32]
    attested_credential_data = bool(flags & 0x40)

    if not attested_credential_data:
        logger.warning("AT flag not set in auth_data flags=0x%02x", flags)
        return None

    # Attested credential data layout (WebAuthn spec):
    #   offset 37: AAGUID          – 16 bytes
    #   offset 53: Credential ID L – 2 bytes (big-endian)
    #   offset 55: Credential ID   – cred_id_len bytes
    #   after that: COSE_Key       – CBOR-encoded
    offset = 37

    if len(auth_data) < offset + 16:
        logger.warning("auth_data too short for AAGUID: %d bytes", len(auth_data))
        return None
    logger.debug("AAGUID: %s", auth_data[offset:offset + 16].hex())
    offset += 16

    if len(auth_data) < offset + 2:
        logger.warning("auth_data too short for cred_id_len: %d bytes", len(auth_data))
        return None
    cred_id_len = int.from_bytes(auth_data[offset:offset + 2], "big")
    offset += 2

    if len(auth_data) < offset + cred_id_len:
        logger.warning(
            "auth_data too short for credential ID: need %d, have %d",
            offset + cred_id_len, len(auth_data),
        )
        return None
    logger.debug(
        "cred_id_len=%d, offset after cred_id=%d, remaining=%d",
        cred_id_len, offset + cred_id_len, len(auth_data) - offset - cred_id_len,
    )
    offset += cred_id_len

    cose_key = _decode_cbor(auth_data[offset:])

    key_type = cose_key.get(1)
    algorithm = cose_key.get(3)
    curve = cose_key.get(-1)
    x = cose_key.get(-2)
    y = cose_key.get(-3)

    if key_type != 2 or algorithm != -7 or curve != 1:
        return None

    if not isinstance(x, bytes) or not isinstance(y, bytes):
        return None

    try:
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import ec
        public_key = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), b"\x04" + x + y)
        pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        return pem.decode("ascii")
    except ImportError:
        raise HTTPException(status_code=500, detail="Cryptography library not available")
    except Exception:
        return None


def _decode_public_key_pem(public_key_str: str) -> Optional[bytes]:
    try:
        return public_key_str.encode("ascii")
    except Exception:
        return None
