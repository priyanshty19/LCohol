import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// Open signup is referral-gated (no allowlist). /signup is public now.
const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/verify-age",
  "/compliance",
  "/denied",
];
const API_AUTH_ROUTES = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  "/api/auth/me",
];

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)
  ) {
    return NextResponse.next({ request });
  }

  const isPublic =
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) ||
    API_AUTH_ROUTES.some((r) => pathname.startsWith(r));

  // Resolve session once (Web Crypto only — no DB; Prisma can't run on edge).
  // Edge verifies the HMAC + self-expiry; per-user epoch revocation is enforced
  // in getCurrentUser (needs the DB).
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const email = (token ? await verifySessionToken(token) : null)?.email ?? null;

  if (isPublic) {
    // Logged-in users shouldn't see the auth screens.
    if ((pathname === "/login" || pathname === "/signup") && email) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  if (!email) {
    // API routes enforce their own auth (proper 401/403 JSON, not an HTML redirect).
    if (pathname.startsWith("/api")) {
      return NextResponse.next({ request });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
