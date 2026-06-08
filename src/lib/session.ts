/**
 * Cookie-based session using HMAC-SHA256 (Web Crypto — works on Edge + Node).
 * Cookie: ss_auth = base64(email).base64url(HMAC)
 */

export const SESSION_COOKIE = "ss_auth";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

function getSecret(): string {
  return process.env.SESSION_SECRET ?? "sipstories-dev-secret-change-in-prod";
}

function bufToBase64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

export async function createSessionToken(email: string): Promise<string> {
  const key = await getKey(getSecret());
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(email.toLowerCase())
  );
  return `${btoa(email.toLowerCase())}.${bufToBase64url(sig)}`;
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const [encoded] = token.split(".");
    if (!encoded) return null;
    const email = atob(encoded);
    const expected = await createSessionToken(email);
    // constant-time compare via timing-safe equality
    if (token.length !== expected.length) return null;
    let diff = 0;
    for (let i = 0; i < token.length; i++) {
      diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    return diff === 0 ? email : null;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
