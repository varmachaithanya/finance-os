import { api } from './api';

export interface WebAuthnRegistrationBeginResponse {
  challenge: string;
  rp: { name: string; id: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: { type: string; alg: number }[];
  authenticatorSelection: { residentKey: string; userVerification: string };
  attestation: string;
  timeout: number;
}

export interface WebAuthnLoginBeginResponse {
  challenge: string;
  rp_id: string;
  allowCredentials: { type: string; id: string }[];
  timeout: number;
  user_verified: boolean;
}

export interface WebAuthnLoginCompleteResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export const webauthnService = {
  registerBegin: () =>
    api.post<WebAuthnRegistrationBeginResponse>('/auth/webauthn/register/begin').then((r) => r.data),

  registerComplete: (data: {
    credential_id: string;
    raw_id: string;
    client_data_json: string;
    attestation_object: string;
    device_name?: string;
  }) => api.post('/auth/webauthn/register/complete', data).then((r) => r.data),

  loginBegin: (email: string) =>
    api.post<WebAuthnLoginBeginResponse>('/auth/webauthn/login/begin', { email }).then((r) => r.data),

  loginComplete: (data: {
    credential_id: string;
    raw_id: string;
    client_data_json: string;
    authenticator_data: string;
    signature: string;
    email: string;
  }) =>
    api.post<WebAuthnLoginCompleteResponse>('/auth/webauthn/login/complete', data).then((r) => r.data),

  listCredentials: () => api.get<{ id: string; credential_id: string; device_name: string }[]>('/auth/webauthn/credentials').then((r) => r.data),

  deleteCredential: (id: string) => api.delete(`/auth/webauthn/credentials/${id}`).then((r) => r.data),
};
