# Go-Live hardening — Vercel Firewall (WAF)

The in-app rate limiter (`src/lib/rate-limit.ts`) is **per serverless instance**
(an in-memory Map). Under real traffic Vercel runs many instances, so a
determined client can exceed a limit by spreading requests across them — this is
how the "many mixes named X" self-attack slipped past the 8/min create cap.

The durable fix is a **network-level rule at the edge**, before requests reach a
function. Configure these in the Vercel dashboard:
**Project → Firewall → Custom Rules** (no code deploy needed; changes are live in
seconds and can be rolled back).

## Recommended rules

Rate limits are per-IP over a rolling window. Tune to taste after watching real
traffic in the Firewall observability tab.

| # | Match (path + method) | Action | Rate |
|---|---|---|---|
| 1 | `POST /api/cocktails/create` | Rate limit → 429 | 10 / min per IP |
| 2 | `POST /api/posts` | Rate limit → 429 | 12 / min per IP |
| 3 | `POST /api/posts/*/vote` | Rate limit → 429 | 60 / min per IP |
| 4 | `POST /api/posts/*/comments` | Rate limit → 429 | 20 / min per IP |
| 5 | `POST /api/auth/*` (otp, check-email) | Rate limit → 429 | 20 / min per IP |
| 6 | `GET /api/cocktails` (has `?q=`) | Rate limit → 429 | 60 / min per IP |
| 7 | Any `/api/*` | Rate limit → 429 (safety net) | 300 / min per IP |

Keep the app-level limits in place too — defense in depth. The edge rule stops
floods cheaply; the app rule stays correct if a request slips through.

## Also worth enabling

- **Bot management / challenge** on the `POST /api/auth/*` and
  `/api/cocktails/create` paths — blocks headless abuse without hurting real users.
- **Attack Challenge Mode** — one-click toggle to ride out an active flood.
- Alerts on the Firewall dashboard so a spike pages you.

## Verifying

After adding rules, fire N+1 rapid requests from one IP (e.g. a short `curl`
loop) against a limited path and confirm the last ones return `429` from the
edge (no function invocation logged for them). The Firewall observability tab
shows blocked vs allowed counts per rule.

## Related in-code guards (already shipped)

- Per-account rate limits + hard row ceilings on write routes.
- `containsProfanity()` on cocktail names and post title/body.
- `isPoolExhausted()` → 503 backoff so the DB pool sheds load gracefully.
- Transaction pooler (port 6543) so concurrent renders don't exhaust connections.
