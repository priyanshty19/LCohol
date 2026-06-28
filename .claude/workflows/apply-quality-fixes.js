export const meta = {
  name: 'apply-quality-fixes',
  description: 'Apply the code-only correctness + perf + UX fixes from the comprehensive audit (file-grouped, one builder per file)',
  phases: [{ title: 'Fix', detail: 'one surgical builder per file' }],
}

const COMMON =
  `SIPSTORIES Next.js 16 repo (cwd S:/LCohol). Match the file's existing style/imports. ` +
  `Additive, minimal changes — do NOT change unrelated logic, response shapes, or schema. ` +
  `Preserve any existing security guards already in the file (rateLimit, isBanned, pool try/catch). ` +
  `Helpers if needed: rateLimit (@/lib/rate-limit), isPoolExhausted/poolBusyResponse (@/lib/db-errors), ` +
  `recomputeKarma (@/lib/karma), canModerate (@/lib/rbac), canonicalizeEmail (@/lib/email-normalize). ` +
  `Return a one-line receipt of what changed.\n`

const FIXES = [
  // --- correctness / security (medium/low) ---
  { f: 'src/lib/rbac.ts', s: 'isAdminEmail() lowercases/trims ADMIN_EMAILS but callers pass canonicalizeEmail(email), so dotted/+tag admin entries never match. Build the ADMIN_EMAILS set through canonicalizeEmail() and compare canonicalized on both sides. Import canonicalizeEmail from @/lib/email-normalize.' },
  { f: 'src/app/api/auth/callback/route.ts', s: 'Open redirect: `${origin}${next}` accepts //evil.com and /\\evil.com. Honor `next` only if it matches /^\\/(?!\\/)[^\\\\]*$/ (path-only, not protocol-relative/backslash), else default to "/".' },
  { f: 'src/lib/referral.ts', s: "TEST_REFERRAL_CODES defaults to a literal code ('IEEE23') when unset → invite-only bypass shipped enabled. Default to an EMPTY set, and only honor test codes when process.env.NODE_ENV !== 'production'. Keep real referral validation intact." },
  { f: 'src/app/api/moderation/delete/route.ts', s: 'Privilege IDOR: gates only on requireRole(MODERATOR) then updates by id. Fetch the target content author + role, 404 if missing, require canModerate(actor.role, targetAuthor.role) (as the ban route does) before flipping isDeleted, map a missing-id P2025 to 404, and call recomputeKarma(authorId) after a comment/post soft-delete so karma does not overstate. Keep the existing rate limit + pool guard.' },
  { f: 'src/app/api/posts/route.ts', s: 'POST only: tagIds/drinkIds are length-capped then mapped straight into nested Prisma creates with no existence check (FK 500 / phantom relations). Intersect the supplied ids against prisma.tag.findMany / prisma.drink.findMany and build the nested create only from valid ids, dropping unknowns. Do NOT touch the GET handler or the existing POST guards (rateLimit, count cap, pool try/catch).' },
  // --- perf (code-only) ---
  { f: 'src/lib/connections.ts', s: 'getConnectionUserIds runs per request multiple times (feed SSR + search). Wrap it in React cache() (import { cache } from "react") to dedupe within a request. Pure refactor — same return value.' },
  { f: 'src/app/api/cocktails/random/route.ts', s: 'Does count() then findFirst({skip: random(count)}) over ~10k rows every call (Postgres walks `skip` rows). Replace with a cheaper pick: fetch a small set of candidate ids once (e.g. take a window ordered by id with a random cursor, or select id then pick in JS) and return one. Keep the response shape identical.' },
  // --- experience (UX) ---
  { f: 'src/components/feed/post-list.tsx', s: 'Empty feed returns null → blank page for new users (the common case). Render an empty-state block instead (icon + "No stories here yet" + a CTA link to /create "Share the first one"); vary copy slightly by sort if easy. Keep the existing list rendering for non-empty.' },
  { f: 'src/components/feed/share-button.tsx', s: 'The single `done` status string renders in text-primary (gold/success) for BOTH success and failure, so errors read as success. Track success vs error separately and render error text in the destructive / var(--ml-sos) color.' },
  { f: 'src/components/feed/comment-thread.tsx', s: 'Comment submit only acts on res.ok; on failure nothing shows. Add try/catch + an error state, render an inline "Couldn\'t post — try again" with role="alert", and keep the typed text for retry.' },
  { f: 'src/components/drinks/drinks-view.tsx', s: 'Subheading hardcodes "46 spirits, beers & wines" — fake/stale, violates the no-fake-data rule. Replace with a real total (fetch from /api/drinks/filters if it returns a count, or derive from a count the view already has); if no real number is available, drop the number for honest copy. Do not invent a number.' },
  // --- error boundaries (new files — explicitly requested) ---
  { f: 'src/app/(main)/error.tsx + src/app/global-error.tsx', s: 'There are no error boundaries — thrown errors show the bare Next screen. CREATE a "use client" styled src/app/(main)/error.tsx (props {error, reset}) with a reset() retry + a "Back to feed" link, matching the tone of the existing not-found.tsx, and CREATE src/app/global-error.tsx (must render its own <html><body>). Dark/glass aesthetic, no fake data.' },
]

phase('Fix')
const receipts = await parallel(
  FIXES.map((fx) => () =>
    agent(
      `${COMMON}\nFix this file (or files): ${fx.f}\nWhat to do: ${fx.s}\nRead it first, then apply.`,
      { agentType: 'caveman:cavecrew-builder', label: `qfix:${fx.f.split('/').slice(-1)[0]}`, phase: 'Fix' },
    ),
  ),
)
return { fixed: FIXES.length, receipts: receipts.filter(Boolean) }
