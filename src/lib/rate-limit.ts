import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

/**
 * Redis-backed sliding-window rate limiter (via Upstash), shared correctly
 * across every serverless instance. Falls back to the original in-memory Map
 * (per-process only) when Redis isn't provisioned yet, so behavior is
 * unchanged until the Upstash env vars are set — no migration step required.
 * A Redis error at request time fails OPEN (allows the request) rather than
 * 500ing every route in the app; an outage should degrade limiting, not
 * take down the product.
 */
type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

function inMemoryRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

// One Ratelimit instance per distinct (limit, windowMs) pair — Upstash's
// sliding-window limiter is configured with a fixed limit+window at construction.
const limiters = new Map<string, Ratelimit>();
function getLimiter(limit: number, windowMs: number): Ratelimit {
  const k = `${limit}:${windowMs}`;
  let rl = limiters.get(k);
  if (!rl) {
    rl = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      prefix: "ratelimit",
    });
    limiters.set(k, rl);
  }
  return rl;
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (!redis) return inMemoryRateLimit(key, limit, windowMs);
  try {
    const { success } = await getLimiter(limit, windowMs).limit(key);
    return success;
  } catch (e) {
    console.error("[rateLimit] Redis unavailable, failing open", e);
    return true;
  }
}

/**
 * Fail-CLOSED variant, for paths where losing the limiter is worse than losing
 * the request: credential checks, OTP completion, account mutations.
 *
 * `rateLimit` deliberately fails open so a Redis blip degrades limiting instead
 * of taking the product down — the right call for reads. It is the wrong call
 * in front of auth: an outage would silently remove the only brake on
 * credential stuffing and enumeration, exactly when nobody is watching.
 */
export async function rateLimitStrict(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  if (!redis) return inMemoryRateLimit(key, limit, windowMs);
  try {
    const { success } = await getLimiter(limit, windowMs).limit(key);
    return success;
  } catch (e) {
    console.error("[rateLimitStrict] Redis unavailable, failing CLOSED", e);
    return false;
  }
}

export function clientIp(request: Request): string {
  // Prefer x-real-ip: on Vercel the platform sets it to the true client IP and
  // overwrites any client-supplied value, so it can't be spoofed. Only fall back
  // to x-forwarded-for, and then to its LAST hop (added by the trusted proxy) —
  // never the first entry, which the client controls and could randomize to
  // defeat the limiter. NOTE: still per-instance; a WAF rule is the real backstop.
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }
  // Every unidentifiable caller previously shared the single key "unknown", so
  // at scale one noisy client could exhaust that bucket and 429 every other
  // unattributable request. Spread them over a small set of stable buckets
  // derived from request shape: still bounded (so it can't be used to escape
  // limiting) but no longer one global point of shared failure.
  const ua = request.headers.get("user-agent") ?? "";
  let h = 0;
  for (let i = 0; i < ua.length; i++) h = (h * 31 + ua.charCodeAt(i)) | 0;
  return `unknown-${Math.abs(h) % 16}`;
}
