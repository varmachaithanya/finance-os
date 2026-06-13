from typing import Optional

from pydantic import BaseModel


class WebAuthnRegistrationBeginResponse(BaseModel):
    challenge: str
    rp: dict
    user: dict
    pubKeyCredParams: list[dict]
    authenticatorSelection: dict
    attestation: str
    timeout: int


class WebAuthnRegistrationCompleteRequest(BaseModel):
    credential_id: str
    raw_id: str
    client_data_json: str
    attestation_object: str
    device_name: Optional[str] = None


class WebAuthnLoginBeginRequest(BaseModel):
    email: str


class WebAuthnLoginBeginResponse(BaseModel):
    challenge: str
    rp_id: str
    allowCredentials: list[dict]
    timeout: int
    user_verified: bool


class WebAuthnLoginCompleteRequest(BaseModel):
    credential_id: str
    raw_id: str
    client_data_json: str
    authenticator_data: str
    signature: str
    email: str


class WebAuthnLoginCompleteResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
