# Deploy runbook — merging PR #24 (security hardening)

Do these in order. The ordering is load-bearing: the new code **refuses to boot without `SESSION_SECRET`** and **selects a `token_epoch` column that must exist first**.

---

## 0. Rotate the DB password (do first — it was exposed earlier)
- Supabase → **Settings → Database → Reset database password** → copy the new password.
- You'll paste it into the two Vercel URLs in step 1 (and your local `.env` for step 2).

## 1. Vercel → Project → Settings → Environment Variables (Production)
| Var | Value | Status |
|---|---|---|
| `DATABASE_URL` | transaction pooler **:6543** + `?pgbouncer=true&connection_limit=1`, **new password** | already set — just update the password |
| `DIRECT_URL` | session **:5432**, **new password** | already set — just update the password |
| `SESSION_SECRET` | **NEW** — long random, e.g. `openssl rand -base64 48` | **must add** (app won't boot without it) |
| `ADMIN_EMAILS` | comma-separated admin emails | confirm it's set (else no admins) |
| `TEST_REFERRAL_CODES` | leave **unset/empty** | confirm not set in prod |

Confirm already-present: `CRON_SECRET`, the VAPID keys, `NEXT_PUBLIC_SUPABASE_URL`, Clerk keys.

> Setting `SESSION_SECRET` (or rotating it) logs everyone out once — expected and desired (old tokens were forgeable). The new token format also forces one clean re-login regardless.

## 2. Prisma — add the `token_epoch` column (BEFORE deploying the code)
From your machine, with local `.env` `DIRECT_URL` pointing at prod (:5432, new password):
```bash
npx prisma db push        # additive: adds users.token_epoch default 0 — non-destructive
npx prisma generate       # refresh the client (already committed, but safe to re-run)
```
- This is safe to run while the OLD code is live — an extra column it doesn't read is ignored.
- Shared prod DB → `db push` only (never `migrate dev`, never `--accept-data-loss`).

## 3. Deploy
- Merge **PR #24** → Vercel auto-deploys. The env from step 1 + the column from step 2 are now in place, so `getCurrentUser` resolves and the app boots.

## 4. Prisma — search indexes (AFTER deploy; anytime, idempotent)
```bash
npx tsx prisma/add-trgm-indexes.ts   # uses DIRECT_URL; CREATE INDEX CONCURRENTLY (no table lock)
```
Adds pg_trgm GIN indexes (cocktail/drink/post/bar/profile names + descriptions) so substring search stops seq-scanning. Safe to re-run.

## 5. Vercel → Firewall (WAF) — the real DoS/abuse backstop
The app's in-memory `rateLimit()` is per-instance; a distributed flood bypasses it. Add edge rules:
- Rate-limit `POST /api/*` (especially `/api/auth/*`, `/api/posts`, `/api/posts/*/comments`, `/api/parties/*/invites`, `/api/cocktails/create`).
- Rate-limit (or gate) `GET /api/bars/nearby` — it proxies a **billed** Google call.

## 6. Verify
- App boots; logging in works (you'll be asked to re-login once).
- Vercel logs: no `EMAXCONNSESSION` / `EMAXCONN`, no "missing column token_epoch".
- Run the k6 harness against **staging** (never prod): `scripts/loadtest/` — hot endpoints should shed (429/409/503), never 500.
- Clean up the abuse-test rows: `npx tsx scripts/cleanup-attack-cocktails.ts` (dry run) → `--apply`.

---

### One-liner order
rotate password → set Vercel env (`SESSION_SECRET` + new-password URLs) → `prisma db push` → merge/deploy #24 → `add-trgm-indexes.ts` → WAF rules → verify.
