export const meta = {
  name: 'apply-hardening',
  description: 'Apply the 5-guard mutation-route pattern (ban + rate limit + input caps + per-user cap + pool guard) across P0/P1/P2 routes',
  phases: [{ title: 'Harden', detail: 'one surgical builder per route, per the backlog spec' }],
}

const COMMON =
  `SIPSTORIES Next.js 16 repo (cwd S:/LCohol). Gold standard to mirror EXACTLY: src/app/api/cocktails/create/route.ts.\n` +
  `Helpers (already exist, import them):\n` +
  `  import { rateLimit } from "@/lib/rate-limit";            // rateLimit(key, limit, windowMs): boolean — false = over limit\n` +
  `  import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";\n` +
  `Rules:\n` +
  `  - Use the route's EXISTING user object (me = getCurrentUser(), or guard.user from requireRole). Don't change auth style.\n` +
  `  - Add guards BEFORE any DB work, in this order: isBanned->403 (only if the route uses getCurrentUser and lacks it; requireRole routes already gate role but ADD ban only if asked), rateLimit->429 with { "Retry-After": "60" } header, input .slice() caps, per-user count() ceiling->409 (creates only).\n` +
  `  - Wrap the DB work in try/catch; in catch: if (isPoolExhausted(err)) return poolBusyResponse(); else keep the existing error response (console.error + 500).\n` +
  `  - DO NOT change success response shapes, route signatures, or business logic. Additive guards only.\n` +
  `  - DO NOT add @@unique or any schema change; dedup in JS (new Set) instead.\n` +
  `  - rate-limit key = account id for authed routes; keep IP keys only for pre-auth (login/signup/otp/validate).\n`

const FIXES = [
  // ---- P0 ----
  { f: 'src/app/api/posts/[id]/comments/route.ts', s: 'ban 403; rateLimit(`comment-create:${me.id}`,10,60000); body.slice(0,4000); reject non-string parentId; ceiling: comments by me on this post >= 100 -> 409; pool guard.' },
  { f: 'src/app/api/posts/route.ts', s: 'POST only: rateLimit(`post-create:${me.id}`,10,60000); title.slice(0,300); postBody.slice(0,10000); tagIds.slice(0,10); drinkIds.slice(0,10); ceiling: post.count by me >= 500 -> 409; pool guard.' },
  { f: 'src/app/api/push/subscribe/route.ts', s: 'ceiling: pushSubscription.count for user >= 20 -> 409; isBanned 403; rateLimit(`push-sub:${user.id}`,10,60000); slice endpoint(0,1024)/p256dh(0,512)/auth(0,512)/userAgent(0,512); pool guard.' },
  { f: 'src/app/api/posts/[id]/share/route.ts', s: 'rateLimit(`post-share:${me.id}`,10,60000); dedup+cap toUserIds via [...new Set(toUserIds)].slice(0,50); use createMany({ skipDuplicates: true }); pool guard.' },
  { f: 'src/app/api/parties/[id]/invites/route.ts', s: 'isBanned 403; rateLimit(`party-invite:${me.id}`,10,60000); userIds.slice(0,50); gate generateLink on existing link-invite count for inviter < 100 else 409; pool guard.' },
  { f: 'src/app/api/parties/route.ts', s: 'POST only: rateLimit(`party-create:${me.id}`,8,60000); ceiling: partyPlan.count by me >= 100 -> 409; pool guard.' },
  { f: 'src/app/api/parties/[id]/games/route.ts', s: 'POST only: isBanned 403; rateLimit(`party-game:${me.id}`,10,60000); text.slice(0,200); ceiling: suggestions by me on this party >= 20 -> 409; pool guard.' },
  { f: 'src/app/api/connections/requests/route.ts', s: 'POST only: re-key existing rate limit to `conn-request:${me.id}` (account, not IP); ceiling: pending requests fromUserId=me >= 100 -> 409; add pool guard to catch.' },
  { f: 'src/app/api/moderation/report/route.ts', s: 'reason.slice(0,80); details.slice(0,2000); ceiling: report.count by me >= 200 -> 409; pool guard.' },
  // ---- P1 ----
  { f: 'src/app/api/posts/[id]/vote/route.ts', s: 'isBanned 403; rateLimit(`vote:${me.id}`,30,60000); pool guard.' },
  { f: 'src/app/api/parties/[id]/rsvp/route.ts', s: 'isBanned 403; rateLimit(`rsvp:${me.id}`,12,60000); pool guard.' },
  { f: 'src/app/api/parties/[id]/drinks/route.ts', s: 'isBanned 403; rateLimit(`party-drink:${me.id}`,15,60000); per-party drink count ceiling 100 -> 409; slice any refId/string field; pool guard.' },
  { f: 'src/app/api/parties/[id]/games/vote/route.ts', s: 'isBanned 403; rateLimit(`game-vote:${me.id}`,30,60000); IMPORTANT: the existing catch swallows errors into 200 — change it to return poolBusyResponse() on isPoolExhausted(err), else a real error response.' },
  { f: 'src/app/api/party/[code]/accept/route.ts', s: 'isBanned 403; rateLimit(`party-accept:${me.id}`,20,60000); pool guard.' },
  { f: 'src/app/api/connections/requests/[id]/accept/route.ts', s: 'rateLimit(`conn-accept:${me.id}`,20,60000); pool guard.' },
  { f: 'src/app/api/connections/requests/[id]/decline/route.ts', s: 'rateLimit(`conn-decline:${me.id}`,20,60000); pool guard.' },
  { f: 'src/app/api/referrals/[id]/revoke/route.ts', s: 'rateLimit(`referral-revoke:${guard.user.id}`,20,60000); pool guard.' },
  { f: 'src/app/api/notifications/read/route.ts', s: 'isBanned 403; rateLimit(`notif-read:${me.id}`,12,60000); pool guard.' },
  { f: 'src/app/api/profile/route.ts', s: 'PATCH only: isBanned 403; rateLimit(`profile-update:${me.id}`,10,60000); slice displayName(0,80)/bio(0,500)/city(0,80)/state(0,80)/emergencyPhone(0,20); pool guard.' },
  { f: 'src/app/api/account/route.ts', s: 'DELETE only: rateLimit(`account-delete:${user.id}`,3,60000); pool guard around the cascade delete.' },
  { f: 'src/app/api/push/unsubscribe/route.ts', s: 'isBanned 403; rateLimit(`push-unsub:${user.id}`,20,60000); endpoint.slice(0,1024); pool guard.' },
  { f: 'src/app/api/bars/[slug]/review/route.ts', s: 'rateLimit(`bar-review:${user.id}`,8,60000); body.slice(0,2000); pool guard.' },
  { f: 'src/app/api/admin/erase-feedback/route.ts', s: 'isBanned 403; rateLimit(`erase-feedback:${user.id}`,10,60000); email.slice(0,254); pool guard.' },
  { f: 'src/app/api/moderation/delete/route.ts', s: 'rateLimit(`mod-delete:${guard.user.id}`,30,60000); reason.slice(0,500); pool guard.' },
  { f: 'src/app/api/moderation/ban/route.ts', s: 'rateLimit(`mod-ban:${guard.user.id}`,20,60000); reason.slice(0,500); pool guard.' },
  { f: 'src/app/api/admin/moderators/route.ts', s: 'rateLimit(`admin-mod:${guard.user.id}`,20,60000); pool guard.' },
  // ---- P2 ----
  { f: 'src/app/api/auth/otp/complete/route.ts', s: 'add pool guard (if isPoolExhausted -> poolBusyResponse before the 500). Keep IP-key. Do NOT touch referral logic.' },
  { f: 'src/app/api/auth/signup/route.ts', s: 'email.slice(0,254) before canonicalize; add pool guard. Keep IP-key.' },
  { f: 'src/app/api/auth/login/route.ts', s: 'email.slice(0,320); password.slice(0,200) (oversized = CPU-bound hash); add pool guard. Keep IP-key.' },
  { f: 'src/app/api/james/agent/route.ts', s: 'add pool guard: detect isPoolExhausted(err) -> poolBusyResponse() BEFORE the generic catch that returns 200. Keep existing rate limit.' },
  { f: 'src/app/api/james/chat/route.ts', s: 'cap each message content .slice(0,2000); wrap the pre-stream DB reads in try/catch -> poolBusyResponse() on isPoolExhausted.' },
  { f: 'src/app/api/referrals/route.ts', s: 'POST only: wrap POST DB work in try/catch -> poolBusyResponse(); re-key rate limit to `referral-create:${guard.user.id}`.' },
  { f: 'src/app/api/referral/validate/route.ts', s: 'referralCode.slice(0,32); try/catch -> poolBusyResponse() on isPoolExhausted.' },
  { f: 'src/app/api/parties/[id]/route.ts', s: 'PATCH only: isBanned 403; rateLimit(`party-patch:${me.id}`,10,60000); pool guard.' },
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
