export const meta = {
  name: 'apply-hardening-2',
  description: 'Apply the 5-guard mutation-route pattern to the remaining P1/P2 routes (resume after session-limit reset)',
  phases: [{ title: 'Harden', detail: 'one surgical builder per remaining route' }],
}

const COMMON =
  `SIPSTORIES Next.js 16 repo (cwd S:/LCohol). Gold standard to mirror EXACTLY: src/app/api/cocktails/create/route.ts.\n` +
  `Helpers (already exist, import them):\n` +
  `  import { rateLimit } from "@/lib/rate-limit";            // rateLimit(key, limit, windowMs): boolean — false = over limit\n` +
  `  import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";\n` +
  `Rules:\n` +
  `  - Use the route's EXISTING user object (me = getCurrentUser(), or guard.user from requireRole). Don't change auth style.\n` +
  `  - Add guards BEFORE any DB work: isBanned->403 (only when the route uses getCurrentUser AND lacks it), rateLimit->429 with { "Retry-After": "60" } header, input .slice() caps.\n` +
  `  - Wrap the DB work in try/catch; in catch: if (isPoolExhausted(err)) return poolBusyResponse(); else keep the existing error response (console.error + 500). If the handler already has a try/catch, just add the isPoolExhausted branch at the TOP of the catch.\n` +
  `  - NEVER .slice() an enum-typed field (e.g. ReportReason, RSVP status). Only free-text strings.\n` +
  `  - When narrowing a body array of unknown type, cast first: (body.xs as unknown[]).filter((x): x is string => typeof x === "string").\n` +
  `  - DO NOT change success response shapes, route signatures, or business logic. Additive guards only. No schema changes.\n` +
  `  - rate-limit key = account id for authed routes; keep IP keys for pre-auth (login/signup/otp/validate).\n`

const FIXES = [
  // ---- remaining P1 ----
  { f: 'src/app/api/connections/requests/[id]/decline/route.ts', s: 'rateLimit(`conn-decline:${me.id}` or guard.user.id,20,60000); pool guard.' },
  { f: 'src/app/api/referrals/[id]/revoke/route.ts', s: 'rateLimit(`referral-revoke:${guard.user.id}`,20,60000); pool guard.' },
  { f: 'src/app/api/notifications/read/route.ts', s: 'isBanned 403; rateLimit(`notif-read:${me.id}`,12,60000); pool guard.' },
  { f: 'src/app/api/profile/route.ts', s: 'PATCH only: isBanned 403; rateLimit(`profile-update:${me.id}`,10,60000); slice displayName(0,80)/bio(0,500)/city(0,80)/state(0,80)/emergencyPhone(0,20) only if those are free-text strings; pool guard. Do NOT slice enum fields like drinkingStyle.' },
  { f: 'src/app/api/account/route.ts', s: 'DELETE only: rateLimit(`account-delete:${user.id}`,3,60000); pool guard around the cascade delete.' },
  { f: 'src/app/api/push/unsubscribe/route.ts', s: 'isBanned 403; rateLimit(`push-unsub:${user.id}`,20,60000); endpoint.slice(0,1024); pool guard.' },
  { f: 'src/app/api/bars/[slug]/review/route.ts', s: 'rateLimit(`bar-review:${user.id}`,8,60000); body/comment free-text .slice(0,2000); do NOT slice the numeric rating; pool guard.' },
  { f: 'src/app/api/admin/erase-feedback/route.ts', s: 'isBanned 403; rateLimit(`erase-feedback:${user.id}`,10,60000); email.slice(0,254); pool guard.' },
  { f: 'src/app/api/moderation/delete/route.ts', s: 'rateLimit(`mod-delete:${guard.user.id}`,30,60000); reason.slice(0,500) only if reason is a free-text string (not enum); pool guard.' },
  { f: 'src/app/api/moderation/ban/route.ts', s: 'rateLimit(`mod-ban:${guard.user.id}`,20,60000); reason.slice(0,500) only if free-text; pool guard.' },
  { f: 'src/app/api/admin/moderators/route.ts', s: 'rateLimit(`admin-mod:${guard.user.id}`,20,60000); pool guard.' },
  // ---- P2 ----
  { f: 'src/app/api/auth/otp/complete/route.ts', s: 'In the existing catch, add if(isPoolExhausted(err)) return poolBusyResponse() BEFORE the 500. Keep IP-key. Do NOT touch referral logic.' },
  { f: 'src/app/api/auth/signup/route.ts', s: 'email.slice(0,254) before canonicalize; pool guard in catch. Keep IP-key.' },
  { f: 'src/app/api/auth/login/route.ts', s: 'email.slice(0,320); password.slice(0,200) (oversized = CPU-bound hash); pool guard in catch. Keep IP-key.' },
  { f: 'src/app/api/james/agent/route.ts', s: 'In the catch that currently returns 200, add if(isPoolExhausted(err)) return poolBusyResponse() FIRST. Keep existing rate limit/logic.' },
  { f: 'src/app/api/james/chat/route.ts', s: 'Cap each message content .slice(0,2000); wrap the pre-stream DB reads in try/catch -> poolBusyResponse() on isPoolExhausted.' },
  { f: 'src/app/api/referrals/route.ts', s: 'POST only: wrap POST DB work in try/catch -> poolBusyResponse() on isPoolExhausted; re-key the existing rate limit to `referral-create:${guard.user.id}`.' },
  { f: 'src/app/api/referral/validate/route.ts', s: 'referralCode.slice(0,32); try/catch -> poolBusyResponse() on isPoolExhausted.' },
  { f: 'src/app/api/parties/[id]/route.ts', s: 'PATCH only: isBanned 403; rateLimit(`party-patch:${me.id}`,10,60000); pool guard. Leave GET/DELETE untouched.' },
]

phase('Harden')
const receipts = await parallel(
  FIXES.map((fx) => () =>
    agent(
      `${COMMON}\nHarden this ONE route file: ${fx.f}\nApply exactly: ${fx.s}\n` +
      `Read it first, match its existing imports/style, apply the additive guards, and return a one-line receipt of what you changed.`,
      { agentType: 'caveman:cavecrew-builder', label: `harden:${fx.f.split('/').slice(-2).join('/')}`, phase: 'Harden' },
    ),
  ),
)
return { hardened: FIXES.length, receipts: receipts.filter(Boolean) }
