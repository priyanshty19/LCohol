import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
  return response;
}

// GET form for the stale-session loop-breaker: a valid cookie that no longer
// resolves to a DB user (deleted/migrated/mismatched) gets cleared here and sent
// to /login, so the edge middleware (which trusts the cookie) can't bounce it
// back into an infinite redirect loop. Public route (see middleware allowlist).
export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
  return response;
}
