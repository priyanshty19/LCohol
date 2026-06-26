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
