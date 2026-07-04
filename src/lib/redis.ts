import { Redis } from "@upstash/redis";

// Upstash REST client — no persistent TCP connection, safe to call from
// serverless functions without adding to Postgres's already-constrained pool.
//
// Redis is optional infra: until UPSTASH_REDIS_REST_URL/TOKEN (or Vercel's
// KV_REST_API_URL/TOKEN) are set, `redis` is null and every caller must treat
// that as a cache miss / no-op, never a hard failure — caching is a latency
// optimization, not a dependency the app should break without.
function createClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export const redis = createClient();
