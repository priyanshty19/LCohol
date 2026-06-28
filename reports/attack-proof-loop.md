# SIPSTORIES — Attack-Proof Feedback Loop

A standing, repeatable hardening loop. "Attack-proof" is a process, not a state:
features soften the codebase over time, so this loop is re-run before each release
(or after a feature drop) to catch security / performance / correctness regressions.

```
Ideate ─▶ Build ─▶ Stress & Attack ─▶ Speed ─▶ Functionality ─▶ Experience ─▶ Improvise ─▶ Ship
   ▲                                                                                          │
   └──────────────────────────────────────  (next cycle)  ◀──────────────────────────────────┘
```

## Stages → tooling

| Stage | Tool | Command / artifact |
|---|---|---|
| **Ideate** | Ranked backlog from the last audit | `reports/attack-proof-audit-findings.md` |
| **Build** | Edits on a hotfix/feature branch | — |
| **Stress & Attack** (static) | Audit workflow | `Workflow({ name: "attack-proof-audit" })` → `.claude/workflows/attack-proof-audit.js` |
| **Stress & Attack** (live) | k6 load harness | `scripts/loadtest/` (see its README) |
| **Speed** | Audit "Speed" dimension + build | covered by the workflow + `npm run build` |
| **Functionality** | Audit "Functionality" dimension + types | covered by the workflow + `npx tsc --noEmit` |
| **Experience** | Audit "Experience" dimension + preview | workflow + `preview_*` browser verify |
| **Improvise** | Fix P0→P1, re-verify | edits + re-run affected audit dimension |
| **Ship** | Build green → PR → deploy | `npm run build` → `gh pr ...` |

## The audit workflow

`.claude/workflows/attack-proof-audit.js` — a multi-agent pass that:
1. **Maps** the API/auth surface, DB/perf hot paths, and client/UGC surface.
2. **Attacks** by vector — IDOR/broken-access-control, injection/XSS/SSRF, rate-limit/DoS,
   auth/session, mass-assignment, secret/PII exposure — each finding **adversarially
   verified** (a skeptic agent must trace a concrete exploit or it's dropped).
3. **Sweeps** speed, functionality, experience.
4. **Synthesizes** one ranked P0→low backlog with concrete fixes.

Re-run any time; same inputs → cached agents on resume.

## Severity rubric

- **Critical** — unauthenticated impact, auth bypass, IDOR on another user's data, injection, or one account able to take down the service (unbounded write / DoS amplification).
- **High** — authenticated abuse without a guard (write route, no rate limit / cap), secret exposure, privilege gap.
- **Medium** — read path without a pool guard, perf cliffs, correctness edge cases.
- **Low** — experience/a11y polish, defensive hardening.

## Ship gate (definition of done)

A change ships only when **all** hold:
- [ ] No open **critical/high** findings in the touched area.
- [ ] `npx tsc --noEmit` clean.
- [ ] `npm run build` green.
- [ ] Live harness: hot write endpoints **shed** (429/409/503) under load — never 500.
- [ ] Browser-verified for user-facing changes (when prod isn't mid-incident).

## Reference defenses (apply everywhere)

- **Every mutating route:** auth gate → `isBanned` → `rateLimit(key, limit, windowMs)` → input size caps → per-user resource cap → wrap DB in try/catch with `isPoolExhausted()` → `poolBusyResponse()` (503 + Retry-After). Gold standard: `src/app/api/cocktails/create/route.ts`.
- **No per-request query amplification** — collapse loops/N+1 (the create route once fired ~55 queries/call).
- **Edge first** — app-level rate limiting is per-instance; a Vercel WAF/Firewall rule is the real flood defense.
- **DB:** transaction pooler (`:6543`) at runtime, session (`:5432`) for migrations. See `sipstories-supabase-pooler` memory.
