/**
 * Cookie-based session using HMAC-SHA256 (Web Crypto — works on Edge + Node).
 * Cookie: ss_auth = base64url(payload).base64url(HMAC(payload))
 *   payload = "<email>|<iat-seconds>|<tokenEpoch>"
 *   - iat lets a token self-expire after SESSION_MAX_AGE even if the cookie value
 *     is copied out (the cookie's own maxAge doesn't bind the signed token).
 *   - tokenEpoch enables per-user revocation: getCurrentUser rejects a token
 *     whose epoch != User.tokenEpoch, so bumping that column logs a user out
 *     everywhere without rotating the global secret.
 * Old email-only tokens (pre-this-change) fail to parse → everyone re-logs in
 * once on deploy, same as a SESSION_SECRET rotation.
 */

export const SESSION_COOKIE = "ss_auth";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length > 0) return secret;
  // FAIL CLOSED in production — an unset secret would make the HMAC key a public
  // repo constant (anyone could forge a session for any email, incl. admin).
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET is not set — refusing to start to avoid forgeable sessions. " +
        "Set a long random value in the environment.",
    );
  }
  return "sipstories-dev-only-insecure-secret";
}

function bufToBase64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// payload is ASCII (canonical email + digits + "|"), so plain btoa/atob is safe.
function strToB64url(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function b64urlToStr(s: string): string {
  return atob(s.replace(/-/g, "+").replace(/_/g, "/"));
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function signPayload(payload: string): Promise<string> {
  const key = await getKey(getSecret());
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bufToBase64url(sig);
}

export type SessionPayload = { email: string; iat: number; epoch: number };

export async function createSessionToken(email: string, epoch = 0): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const payload = `${email.toLowerCase()}|${iat}|${epoch}`;
  return `${strToB64url(payload)}.${await signPayload(payload)}`;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const [encoded, sig] = token.split(".");
    if (!encoded || !sig) return null;
    const payload = b64urlToStr(encoded);
    const expected = await signPayload(payload);
    // constant-time compare of the signatures
    if (sig.length !== expected.length) return null;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    if (diff !== 0) return null;

    const [email, iatStr, epochStr] = payload.split("|");
    const iat = Number(iatStr);
    const epoch = Number(epochStr);
    // Reject malformed (incl. legacy email-only tokens) and self-expire by maxAge.
    if (!email || !Number.isFinite(iat) || !Number.isFinite(epoch)) return null;
    if (Math.floor(Date.now() / 1000) - iat > SESSION_MAX_AGE) return null;
    return { email, iat, epoch };
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
