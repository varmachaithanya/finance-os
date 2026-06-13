function b64url(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function ab2str(buf: ArrayBuffer): string {
  return String.fromCharCode(...new Uint8Array(buf));
}

export async function createCredential(
  options: PublicKeyCredentialCreationOptions
): Promise<{ credential_id: string; raw_id: string; client_data_json: string; attestation_object: string } | null> {
  if (!navigator.credentials || !navigator.credentials.create) {
    console.warn('WebAuthn not available');
    return null;
  }
  try {
    const cred = (await navigator.credentials.create({ publicKey: options })) as PublicKeyCredential;
    const response = cred.response as AuthenticatorAttestationResponse;
    return {
      credential_id: cred.id,
      raw_id: b64url(cred.rawId),
      client_data_json: b64url(response.clientDataJSON),
      attestation_object: b64url(response.attestationObject),
    };
  } catch (err: any) {
    if (err.name === 'NotAllowedError' || err.name === 'AbortError') return null;
    console.error('WebAuthn create error:', err);
    throw err;
  }
}

export async function getCredential(
  options: PublicKeyCredentialRequestOptions
): Promise<{
  credential_id: string;
  raw_id: string;
  client_data_json: string;
  authenticator_data: string;
  signature: string;
} | null> {
  if (!navigator.credentials || !navigator.credentials.get) {
    console.warn('WebAuthn not available');
    return null;
  }
  try {
    const cred = (await navigator.credentials.get({ publicKey: options })) as PublicKeyCredential;
    const response = cred.response as AuthenticatorAssertionResponse;
    return {
      credential_id: cred.id,
      raw_id: b64url(cred.rawId),
      client_data_json: b64url(response.clientDataJSON),
      authenticator_data: b64url(response.authenticatorData),
      signature: b64url(response.signature),
    };
  } catch (err: any) {
    if (err.name === 'NotAllowedError' || err.name === 'AbortError') return null;
    console.error('WebAuthn get error:', err);
    throw err;
  }
}

export function supportsWebAuthn(): boolean {
  return !!(
    navigator.credentials &&
    navigator.credentials.create &&
    navigator.credentials.get &&
    PublicKeyCredential
  );
}

export function decodeServerOptions(options: any): PublicKeyCredentialCreationOptions {
  return {
    ...options,
    challenge: b64urlDecode(options.challenge),
    user: {
      ...options.user,
      id: b64urlDecode(options.user.id),
    },
    excludeCredentials: options.excludeCredentials?.map((c: any) => ({
      ...c,
      id: b64urlDecode(c.id),
    })) || [],
  };
}

export function decodeServerRequestOptions(options: any): PublicKeyCredentialRequestOptions {
  return {
    ...options,
    challenge: b64urlDecode(options.challenge),
    allowCredentials: options.allowCredentials?.map((c: any) => ({
      ...c,
      id: b64urlDecode(c.id),
    })) || [],
  };
}
