from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.webauthn import (
    WebAuthnLoginBeginRequest,
    WebAuthnLoginBeginResponse,
    WebAuthnLoginCompleteRequest,
    WebAuthnLoginCompleteResponse,
    WebAuthnRegistrationBeginResponse,
    WebAuthnRegistrationCompleteRequest,
)
from app.services.webauthn_service import WebAuthnService

router = APIRouter(prefix="/auth/webauthn", tags=["WebAuthn"])


@router.post("/register/begin", response_model=WebAuthnRegistrationBeginResponse)
def register_begin(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service = WebAuthnService(db)
    return service.begin_registration(str(current_user.id))


@router.post("/register/complete")
def register_complete(
    body: WebAuthnRegistrationCompleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service = WebAuthnService(db)
    return service.complete_registration(
        user_id=str(current_user.id),
        credential_id=body.credential_id,
        raw_id=body.raw_id,
        client_data_json=body.client_data_json,
        attestation_object=body.attestation_object,
        device_name=body.device_name,
    )


@router.post("/login/begin", response_model=WebAuthnLoginBeginResponse)
def login_begin(
    body: WebAuthnLoginBeginRequest,
    db: Session = Depends(get_db),
) -> dict:
    service = WebAuthnService(db)
    return service.begin_login(body.email)


@router.post("/login/complete", response_model=WebAuthnLoginCompleteResponse)
def login_complete(
    body: WebAuthnLoginCompleteRequest,
    db: Session = Depends(get_db),
) -> dict:
    service = WebAuthnService(db)
    return service.complete_login(
        email=body.email,
        credential_id=body.credential_id,
        client_data_json=body.client_data_json,
        authenticator_data=body.authenticator_data,
        signature=body.signature,
    )


@router.get("/credentials")
def list_credentials(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    service = WebAuthnService(db)
    return service.get_credentials(str(current_user.id))


@router.delete("/credentials/{credential_id}")
def delete_credential(
    credential_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service = WebAuthnService(db)
    service.delete_credential(str(current_user.id), credential_id)
    return {"message": "Credential deleted"}
