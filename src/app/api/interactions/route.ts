import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { logInteraction } from "@/lib/interactions";
import { rateLimit } from "@/lib/rate-limit";
import type { InteractionType, TargetType } from "@/generated/prisma/client";

// Client beacon for events that only exist in the browser (page views, opening a
// feature). Allowlisted so a client can't write arbitrary enum values or spam
// mutation-type events (those are logged server-side from their own routes).
const CLIENT_TYPES = new Set<InteractionType>(["VIEW", "CLICK_DRINK", "SEARCH", "ASK_JAMES", "SHARE", "BOOKMARK"]);
const CLIENT_TARGETS = new Set<TargetType>([
  "POST", "DRINK", "COCKTAIL", "PROFILE", "BAR", "PARTY", "MIXLAB", "JAMES", "FEATURE", "SEARCH_QUERY",
]);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  // Beacons from logged-out (or banned) visitors are silently ignored (still 200 so
  // sendBeacon never surfaces an error).
  if (!user || user.isBanned) return NextResponse.json({ ok: true });

  // Cap write-amplification: a client could otherwise loop sendBeacon to flood
  // inserts (cost + poisons the signals). 120 events/min/user is generous for
  // genuine page views; excess is dropped silently.
  if (!(await rateLimit(`beacon:${user.id}`, 120, 60_000))) {
    return NextResponse.json({ ok: true });
  }

  const body = await request.json().catch(() => ({}));
  const interactionType = body?.interactionType as InteractionType;
  const targetType = body?.targetType as TargetType;

  if (!CLIENT_TYPES.has(interactionType) || !CLIENT_TARGETS.has(targetType)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  logInteraction({
    userId: user.id,
    interactionType,
    targetType,
    targetId: typeof body?.targetId === "string" ? body.targetId : null,
    context: body?.context && typeof body.context === "object" ? body.context : undefined,
  });

  return NextResponse.json({ ok: true });
}
