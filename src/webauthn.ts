import type { PasskeyCredential, User } from "./types";

const decoder = new TextDecoder();

function bytesToBase64Url(bytes: Uint8Array) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function randomChallenge() {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return challenge;
}

export async function getPasskeySupport() {
  if (!window.isSecureContext || !("PublicKeyCredential" in window) || !navigator.credentials) {
    return false;
  }

  const credentialApi = PublicKeyCredential as typeof PublicKeyCredential & {
    isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>;
  };

  if (!credentialApi.isUserVerifyingPlatformAuthenticatorAvailable) {
    return true;
  }

  try {
    return await credentialApi.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function createPasskeyForUser(user: User): Promise<PasskeyCredential> {
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: randomChallenge(),
      rp: { name: "SuperList" },
      user: {
        id: new TextEncoder().encode(user.uid),
        name: user.email,
        displayName: user.name
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 }
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "required"
      },
      timeout: 60000,
      attestation: "none"
    }
  });

  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error("Nao foi possivel criar a passkey.");
  }

  return {
    id: credential.id,
    userId: user.uid,
    email: user.email,
    rawId: bytesToBase64Url(new Uint8Array(credential.rawId)),
    label: "Biometria deste dispositivo",
    createdAt: Date.now()
  };
}

export async function getPasskeyAssertion(passkeys: PasskeyCredential[]) {
  if (passkeys.length === 0) {
    throw new Error("Nenhuma biometria cadastrada neste navegador.");
  }

  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: randomChallenge(),
      allowCredentials: passkeys.map((passkey) => ({
        id: base64UrlToBytes(passkey.rawId),
        type: "public-key",
        transports: ["internal"] as AuthenticatorTransport[]
      })),
      timeout: 60000,
      userVerification: "required"
    }
  });

  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error("A autenticacao biometrica nao foi concluida.");
  }

  return passkeys.find((passkey) => passkey.id === credential.id) ?? null;
}

export function describePasskeyError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Leitura biometrica cancelada ou expirada. Voce ainda pode entrar com e-mail e senha.";
    }
    if (error.name === "NotSupportedError") {
      return "Este navegador nao suporta biometria/passkeys.";
    }
    if (error.name === "InvalidStateError") {
      return "Esta biometria ja parece estar cadastrada neste dispositivo.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Nao foi possivel concluir a autenticacao biometrica.";
}

export function passkeyUserHandleText(assertion: AuthenticatorAssertionResponse) {
  return assertion.userHandle ? decoder.decode(assertion.userHandle) : "";
}
