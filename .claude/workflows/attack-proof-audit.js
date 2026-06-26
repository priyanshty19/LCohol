export const meta = {
  name: 'attack-proof-audit',
  description: 'Whole-codebase hardening audit: attack surface + speed + functionality + experience, adversarially verified, ranked backlog',
  whenToUse: 'Run before shipping a release, or after a feature drop, to catch security/perf/correctness regressions. Re-run as the standing hardening loop.',
  phases: [
    { title: 'Map', detail: 'orient: API/auth surface + DB/perf hot paths + client/UGC surface' },
    { title: 'Attack', detail: 'one finder per vector, each finding adversarially verified' },
    { title: 'Quality', detail: 'speed + functionality + experience sweeps' },
    { title: 'Synthesize', detail: 'one ranked P0→low backlog across all dimensions' },
  ],
}

// ---- schemas -------------------------------------------------------------
const MAP_SCHEMA = {
  type: 'object',
  properties: {
    notes: { type: 'string', description: 'concise orientation: how auth works, where authz is enforced, hottest DB paths, where user content is rendered' },
    hotspots: { type: 'array', items: { type: 'string' }, description: 'file:area worth a closer look' },
  },
  required: ['notes'],
}

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          dimension: { type: 'string' },
          location: { type: 'string', description: 'file:line' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          detail: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['title', 'location', 'severity', 'detail', 'fix'],
      },
    },
  },
  required: ['findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    real: { type: 'boolean' },
    severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
    reason: { type: 'string' },
  },
  required: ['real', 'severity', 'reason'],
}

const CWD = 'cwd S:/LCohol (Next.js 16 App Router, Prisma 7 + Supabase, Clerk-OTP + custom ss_auth cookie)'

// ---- Phase 1: Map (barrier — attack finders need the full picture) -------
phase('Map')
const maps = (await parallel([
  () => agent(
    `Map the API + auth attack surface of the SIPSTORIES repo. ${CWD}. ` +
    `Grep src/app/api/**/route.ts for handlers; read src/lib/auth.ts, src/lib/api-guard.ts, src/lib/rate-limit.ts, src/lib/supabase/middleware.ts. ` +
    `Summarize: how a request is authenticated, where object-level authorization is (and isn't) enforced, which routes mutate data, which take user input into Prisma. Keep it tight.`,
    { schema: MAP_SCHEMA, label: 'map:api-auth', phase: 'Map' },
  ),
  () => agent(
    `Map the DB + performance hot paths of SIPSTORIES. ${CWD}. ` +
    `Read prisma/schema.prisma (indexes, relations), src/lib/*.ts data loaders, and any $queryRaw/$transaction usage. ` +
    `Summarize: largest tables (10k cocktail rows), unindexed filter/sort columns, N+1 risks, per-request query fan-out, force-dynamic pages. Keep it tight.`,
    { schema: MAP_SCHEMA, label: 'map:db-perf', phase: 'Map' },
  ),
  () => agent(
    `Map the client + user-generated-content surface of SIPSTORIES. ${CWD}. ` +
    `Grep for dangerouslySetInnerHTML, file upload handlers, where post/comment/profile/mix text is rendered, external fetches/redirects. ` +
    `Summarize XSS sinks, upload abuse points, open-redirect/SSRF risks, secret usage in client components. Keep it tight.`,
    { schema: MAP_SCHEMA, label: 'map:client-ugc', phase: 'Map' },
  ),
])).filter(Boolean)

const mapDigest = maps.map((m) => `- ${m.notes}\n  hotspots: ${(m.hotspots || []).join('; ')}`).join('\n')

// ---- Phase 2: Attack — finder per vector, each finding verified ----------
const VECTORS = [
  { key: 'authz-idor', prompt: 'Broken access control / IDOR: routes that act on a resource id from the request without checking the caller owns/may access it (posts, comments, parties, invites, mixes, profiles, connections). Also missing host-only / member-only gates.' },
  { key: 'injection-xss', prompt: 'Injection: Prisma $queryRaw/$executeRaw with interpolation; XSS via dangerouslySetInnerHTML or unescaped user content; SSRF via server-side fetch of user URLs; path traversal in uploads; open redirect.' },
  { key: 'rate-limit-dos', prompt: 'Abuse / DoS: write or expensive endpoints with no rate limit, no per-user resource cap, or per-request query amplification (loops, large fan-out) — the class that just let one account spam 1000 rows. Compare against the hardened src/app/api/cocktails/create/route.ts.' },
  { key: 'auth-session', prompt: 'AuthN/session: cookie/HMAC handling, session fixation, missing isBanned enforcement, email canonicalization gaps, OTP flow abuse, privilege checks for MODERATOR/ADMIN routes.' },
  { key: 'mass-assignment', prompt: 'Mass assignment / over-posting: Prisma create/update fed from req.body fields without an allowlist (e.g. a user setting role, isCurated, isPublic, karma, or another user’s id).' },
  { key: 'secrets-exposure', prompt: 'Secret/PII exposure: server-only keys imported into client components, secrets in logs, sensitive data in URLs/query strings, over-broad API responses leaking other users’ private fields.' },
]

phase('Attack')
const attackResults = await pipeline(
  VECTORS,
  (v) => agent(
    `You are attacking SIPSTORIES to find real, exploitable bugs in the "${v.key}" class. ${CWD}.\n` +
    `Orientation from the mapping phase:\n${mapDigest}\n\n` +
    `Hunt specifically for: ${v.prompt}\n` +
    `Use Grep + Read across src/. Report only concrete findings with file:line and a realistic exploit path. No speculation.`,
    { schema: FINDINGS_SCHEMA, label: `find:${v.key}`, phase: 'Attack' },
  ),
  (res, v) => parallel(
    (res?.findings ?? []).filter((f) => f.severity === 'critical' || f.severity === 'high').map((f) => () =>
      agent(
        `Adversarially verify this ${v.key} finding in SIPSTORIES. ${CWD}.\n` +
        `Claim: ${f.title} @ ${f.location}\nDetail: ${f.detail}\n\n` +
        `Read the actual code + any guard it passes through. Default to real=false unless you can trace a concrete exploit. Re-rate severity.`,
        { schema: VERDICT_SCHEMA, label: `verify:${f.location}`, phase: 'Attack' },
      ).then((v2) => ({ ...f, dimension: 'attack', verdict: v2 })),
    ),
  ).then((verified) => {
    // keep verified high/criticals + pass through medium/low unverified
    const lows = (res?.findings ?? []).filter((f) => f.severity === 'medium' || f.severity === 'low').map((f) => ({ ...f, dimension: 'attack', verdict: { real: true, severity: f.severity, reason: 'not independently verified (med/low)' } }))
    return [...verified.filter(Boolean), ...lows]
  }),
)

// ---- Phase 3: Quality — speed / functionality / experience ---------------
phase('Quality')
const quality = (await parallel([
  () => agent(
    `Performance sweep of SIPSTORIES. ${CWD}.\nOrientation:\n${mapDigest}\n` +
    `Find: N+1 queries, serial awaits that could be Promise.all, unindexed ILIKE/filter/sort on big tables, oversized Prisma includes / RSC payloads, missing/ineffective caching (e.g. dynamic routes whose route-level revalidate is ignored), force-dynamic overuse. file:line + fix each.`,
    { schema: FINDINGS_SCHEMA, label: 'quality:speed', phase: 'Quality' },
  ),
  () => agent(
    `Functionality / correctness sweep of SIPSTORIES core flows (auth, referrals, parties, posts/votes, mixlab, connections). ${CWD}. ` +
    `Find: race conditions, non-atomic multi-write sequences, unhandled error paths, edge cases (empty/duplicate/expired), broken pagination/cursors. file:line + fix each.`,
    { schema: FINDINGS_SCHEMA, label: 'quality:functionality', phase: 'Quality' },
  ),
  () => agent(
    `Experience sweep of SIPSTORIES. ${CWD}. ` +
    `Find: missing error/empty/loading states, destructive actions without confirmation, accessibility gaps (labels, focus, contrast), mobile/responsive breakage, jarring transitions. file:line + fix each.`,
    { schema: FINDINGS_SCHEMA, label: 'quality:experience', phase: 'Quality' },
  ),
])).filter(Boolean).flatMap((r) => (r.findings ?? []).map((f) => ({ ...f, dimension: f.dimension || 'quality', verdict: { real: true, severity: f.severity, reason: 'sweep' } })))

// ---- Phase 4: Synthesize -------------------------------------------------
phase('Synthesize')
const all = [...attackResults.flat().filter(Boolean), ...quality]
const confirmed = all.filter((f) => f.verdict?.real !== false)

const report = await agent(
  `Synthesize a single hardening backlog for SIPSTORIES from ${confirmed.length} confirmed findings:\n${JSON.stringify(confirmed, null, 2)}\n\n` +
  `Output markdown. Order strictly by severity (critical → high → medium → low), then by dimension. ` +
  `For each: a checkbox, the title, file:line, dimension tag, one-sentence impact, and the concrete fix. ` +
  `Put exploitable security findings (auth bypass, IDOR, injection, unbounded write/DoS) at the very top regardless of count. ` +
  `Start with a 5-line executive summary (counts by severity + the single most urgent item). End with a "Patterns to apply everywhere" section distilled from the findings.`,
  { label: 'synthesize-backlog', phase: 'Synthesize' },
)

return { counts: { total: confirmed.length }, report }
