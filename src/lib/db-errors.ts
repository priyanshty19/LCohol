import { NextResponse } from "next/server";

// Supabase's session pooler caps at pool_size=15. When every slot is held,
// Postgres returns FATAL "(EMAXCONNSESSION) max clients reached in session
// mode". That's transient (a slot frees in seconds), so the right response is a
// 503 with Retry-After — telling browsers, CDNs and crawlers to back off — NOT a
// 500 that invites an immediate retry and amplifies the storm.
export function isPoolExhausted(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : (() => {
            try {
              return JSON.stringify(err);
            } catch {
              return "";
            }
          })();
  return (
    msg.includes("EMAXCONNSESSION") ||
    msg.includes("max clients reached") ||
    msg.includes("too many clients")
  );
}

// Standard 503 for a saturated pool. Retry-After is advisory; a couple of
// seconds is enough for the pooler to recycle a slot.
export function poolBusyResponse() {
  return NextResponse.json(
    { error: "Service busy. Please retry in a moment." },
    { status: 503, headers: { "Retry-After": "3" } },
  );
}
