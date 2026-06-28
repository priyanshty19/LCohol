# SIPSTORIES — Mutation-Route Hardening Backlog

> Source: `attack-proof-audit` loop (write-endpoint pass), 2026-06-27. 39 mutating
> routes audited by 41 agents. Gold standard: `src/app/api/cocktails/create/route.ts`.
> Helpers ready to wire: `rateLimit` (`@/lib/rate-limit`), `isPoolExhausted` /
> `poolBusyResponse` (`@/lib/db-errors`). Ban field: `prisma/schema.prisma:20`.

**The single most repeated gap: a pool-exhaustion guard is missing on ~33 of 39 routes.**
A bare 500 (or a swallowed 200) on saturation invites immediate retries that amplify the storm.

## P0 — unbounded write / pool exhaustion (one account can spam rows or saturate the pool)

| # | Route | Fix |
|---|-------|-----|
| P0-1 | `POST /api/posts/[id]/comments` | ban 403 + `rateLimit(comment-create:${me.id},10,60s)` + `body.slice(0,4000)` + validate `parentId` + per-post/user ceiling + pool guard |
| P0-2 | `POST /api/posts` | `rateLimit(post-create,10,60s)` + cap title/body/tagIds/drinkIds + post `count` ceiling 500→409 + pool guard |
| P0-3 | `POST /api/push/subscribe` | per-user device cap 20→409 + ban + `rateLimit(push-sub,10,60s)` + `.slice()` caps + pool guard |
| P0-4 | `POST /api/posts/[id]/share` | `rateLimit(post-share,10,60s)` + `toUserIds.slice(0,50)` + `createMany({skipDuplicates})` + `@@unique` + pool guard |
| P0-5 | `POST /api/parties/[id]/invites` | ban + `rateLimit(party-invite,10,60s)` + `userIds.slice(0,50)` + gate generateLink on link-count<100 + pool guard |
| P0-6 | `POST /api/parties` | `rateLimit(party-create,8,60s)` + `MAX_PARTIES_PER_USER` cap→409 + pool guard |
| P0-7 | `POST /api/parties/[id]/games` | ban + `rateLimit(party-game,10,60s)` + per-party/user cap 20→409 + pool guard |
| P0-8 | `POST /api/connections/requests` | pending-request ceiling 100→409 + re-key rate limit to `${me.id}` + pool guard |
| P0-9 | `POST /api/moderation/report` | `reason.slice(0,80)` + `details.slice(0,2000)` + per-user report cap 200→409 + pool guard |

## P1 — writes missing rate limit + pool guard (rows bounded, DB churn unthrottled)

`POST /api/posts/[id]/vote` · `PATCH /api/parties/[id]/rsvp` · `POST /api/parties/[id]/drinks` · `POST /api/parties/[id]/games/vote` (currently swallows pool errors into 200) · `POST /api/party/[code]/accept` · `POST /api/connections/requests/[id]/accept` · `POST /api/connections/requests/[id]/decline` · `POST /api/referrals/[id]/revoke` · `POST /api/notifications/read` · `PATCH /api/profile` · `DELETE /api/account` · `POST /api/push/unsubscribe` · `POST /api/bars/[slug]/review` · `POST /api/admin/erase-feedback` · `POST /api/moderation/delete` · `POST /api/moderation/ban` · `POST /api/admin/moderators`
→ each: ban check (where missing) + `rateLimit(<action>:${id},N,60s)` + input `.slice()` caps + try/catch → `poolBusyResponse()`.

## P2 — auth-boundary / read-heavy missing backoff or caps

`POST /api/auth/otp/complete` (+ empty `TEST_REFERRAL_CODES` in prod) · `POST /api/auth/signup` · `POST /api/auth/login` (`password.slice(0,200)` — oversized = CPU-bound hash) · `POST /api/james/agent` (swallows errors into 200) · `POST /api/james/chat` (cap each message) · `POST /api/referrals` · `POST /api/referral/validate` · `PATCH /api/parties/[id]`
→ pool guard + input caps; auth routes stay IP-keyed (no account yet).

## P3 — low / defense-in-depth

`POST /api/cocktails/create` (gold standard; move limiter to Redis + WAF) · `POST /api/interactions` (cap `targetId`/`context`) · `POST /api/upload` (per-user object ceiling) · `PATCH /api/moderation/reports` · `GET/POST /api/auth/logout`.

## Patterns to apply everywhere

1. **5-guard prologue, in order:** `getCurrentUser()`→401 → `isBanned`→403 → `rateLimit(\`<action>:${me.id}\`,N,60_000)`→429+Retry-After → `.slice()` every string / array → for *creates*, per-user `count()` ceiling→409.
2. **Rate-limit by account id, not IP.** `clientIp()` (first `x-forwarded-for`) is spoofable/NAT-shared. IP-keying is correct only pre-auth (login/signup/otp/validate).
3. **Wrap every write in try/catch → `poolBusyResponse()` on `isPoolExhausted(err)`.** Never a bare 500, never a swallowed 200 (current bug in `james/agent`, `games/vote`).
4. **Idempotency over ceilings** where a natural key exists: `@@unique` + `createMany({skipDuplicates})` / `upsert` so re-fires can't mint rows.
5. **Collapse loops/N+1** (slug/referral-code loops, `recomputeKarma`) and push heavy side-effects into `after()`.
6. **Edge first:** in-memory limiter is per-instance — a **Vercel WAF/Firewall rate rule** on hot write paths is the real backstop.
7. **Privileged routes (ban/delete/moderators):** rate limit (threat model = stolen privileged token), not row cap.

---

# Round 2 — Comprehensive audit (2026-06-28)

`attack-proof-audit` re-run produced **52 findings** (1 critical, 18 high, 22 medium, 10 low) across attack-surface, race/data-integrity, performance, experience. Re-run `/attack-proof-audit` for the full enumerated list.

## Fixed this session (committed to PR #23 / `hotfix/prod-stabilization`)
- ✅ **CRITICAL** `SESSION_SECRET` hardcoded fallback → fail-closed in prod (`b72263e`).
- ✅ Comments IDOR (CIRCLE reads gated), vote IDOR (existence/visibility gate), comment `parentId` validation, profile PII scrub (`8d4f6d4`).
- ✅ `bars/nearby` denial-of-wallet (auth + per-user/per-IP limit + coord cache), `clientIp()` un-spoofed (`33822c9`).
- ✅ All 9 P0 + all P1/P2 mutation routes + party DELETE handlers (earlier commits).

## Done since (commits on `hotfix/prod-stabilization`)
- ✅ **Session revocation + self-expiry** — `tokenEpoch` + `iat` (`1698d30`). *Needs `db push` to add `token_epoch` BEFORE deploy (see commit).*
- ✅ **Public-read DoS** — per-IP rate limit + query bounds + 503 on `/api/posts`, `/api/cocktails`, `/api/drinks`, `/api/drinks/search` (`0ad97f3`).
- ✅ **pg_trgm migration** — `prisma/add-trgm-indexes.ts` upgraded (CONCURRENTLY + description/address; operator runs it) (`1698d30`).
- ✅ **Correctness/perf/UX batch** (`c7ca906`): rbac canonicalize, open-redirect, TEST_REFERRAL_CODES gated, moderation rank-check + karma, post id validation, getConnectionUserIds cache, cocktails/random, empty-feed state, share/comment error states, fake-"46" removed, error boundaries.

## Still remaining (medium/low — careful hand-work or judgment, not auto-edit)
- **Data-integrity (transactions):** vote score atomicity (concurrent double-click drift), RSVP write-after-check race → 404, signup/otp uniqueness P2002 → 409. Hot mutation paths — do by hand.
- **a11y:** shared `role="alert"`/`aria-live` form-message primitive, modal Escape + focus-trap (daily-vibe, bell `aria-expanded`), bar cards as real buttons + `aria-pressed`.
- **Larger refactors:** drink-detail SSR (kill the client-fetch waterfall), recommend-rail `unstable_cache`, drop blanket `force-dynamic` on `(main)`, denormalized popularity counter for `sort=popular`.
- **Infra (operator):** distributed limiter (Upstash) behind `rateLimit()`, Vercel WAF.

## Ship gate before merging PR #23 to main (operator)
1. **Set `SESSION_SECRET`** (long random) in Vercel — app won't boot without it now; forces a clean re-login.
2. **Rotate the DB password** (exposed earlier).
3. **Vercel WAF/Firewall** rate rules on `POST /api/*` + `bars/nearby` (the real DoS/denial-of-wallet backstop; app limiter is per-instance).
4. Run **k6** (`scripts/loadtest/`) against staging → confirm hot endpoints shed (429/409/503), never 500.
5. Cleanup the attack rows (`scripts/cleanup-attack-cocktails.ts --apply`).
