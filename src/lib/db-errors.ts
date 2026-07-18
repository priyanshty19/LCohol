import { NextResponse } from "next/server";

// Pool saturation surfaces several ways depending on which Supabase pooler is
// in front and how it fails:
//   - session pooler full:     "(EMAXCONNSESSION) max clients reached in session mode"
//   - transaction pooler full: "(EMAXCONN) max client connections" (a real flood)
//   - node-postgres can't get a slot in time: "timeout exceeded when trying to connect"
// All are transient (a slot frees in seconds), so the right response is a 503
// with Retry-After — telling browsers, CDNs and attackers to back off — NOT a
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
    msg.includes("EMAXCONN") ||
    msg.includes("max clients reached") ||
    msg.includes("max client connections") ||
    msg.includes("too many clients") ||
    msg.includes("timeout exceeded when trying to connect") ||
    msg.includes("Connection terminated due to connection timeout") ||
    msg.includes("Can't reach database server") ||
    msg.includes("DatabaseNotReachable")
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
