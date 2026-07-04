import { redis } from "@/lib/redis";

// Cache-aside helper for read-heavy, staleness-tolerant data (feed candidate
// windows, taste profiles).
//
// Two tiers, best available wins:
//   1. Upstash Redis (if provisioned) — shared across all serverless instances.
//   2. In-memory Map — per warm instance only, but free. Warm instances serve
//      the bulk of traffic, so short-TTL hot keys (feed windows) still get a
//      useful hit rate with zero infrastructure.
// Any Redis failure falls through to compute, so a cache outage degrades to
// "slower," never "broken."

type MemEntry = { value: unknown; expiresAt: number };
const memCache = new Map<string, MemEntry>();
// Bound memory: feed windows are ~500 posts each; a couple hundred entries is
// plenty for hot keys and keeps a warm lambda comfortably under limits.
const MEM_MAX_ENTRIES = 200;

function memGet<T>(key: string): T | undefined {
  const e = memCache.get(key);
  if (!e) return undefined;
  if (Date.now() > e.expiresAt) {
    memCache.delete(key);
    return undefined;
  }
  return e.value as T;
}

function memSet(key: string, value: unknown, ttlSeconds: number): void {
  if (memCache.size >= MEM_MAX_ENTRIES) {
    // Evict oldest-inserted first (Map preserves insertion order) — cheap
    // near-LRU that's fine for a small, short-TTL cache.
    const oldest = memCache.keys().next().value;
    if (oldest !== undefined) memCache.delete(oldest);
  }
  memCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cachedOrCompute<T>(
  key: string,
  ttlSeconds: number,
  computeFn: () => Promise<T>,
): Promise<T> {
  if (redis) {
    try {
      const cached = await redis.get<T>(key);
      if (cached !== null && cached !== undefined) return cached;
    } catch (e) {
      console.error("[feed-cache] redis read failed, falling through", e);
    }
  } else {
    const cached = memGet<T>(key);
    if (cached !== undefined) return cached;
  }

  const fresh = await computeFn();

  if (redis) {
    redis.set(key, fresh, { ex: ttlSeconds }).catch((e) => {
      console.error("[feed-cache] redis write failed", e);
    });
  } else {
    memSet(key, fresh, ttlSeconds);
  }

  return fresh;
}
