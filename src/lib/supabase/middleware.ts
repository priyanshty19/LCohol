import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { findAllowedUser } from "@/lib/allowed-users";

const PUBLIC_ROUTES = ["/login", "/verify-age", "/compliance", "/denied"];
const API_AUTH_ROUTES = ["/api/auth/login", "/api/auth/logout", "/api/auth/me"];

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

  // Always allow public routes and auth API endpoints
  const isPublic =
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) ||
    API_AUTH_ROUTES.some((r) => pathname.startsWith(r));

  if (isPublic) {
    return NextResponse.next({ request });
  }

  // Validate session cookie
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const email = token ? await verifySessionToken(token) : null;

  if (!email) {
    // Not logged in → redirect to login
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Verify the email is still in the allowlist
  const allowed = findAllowedUser(email);
  if (!allowed) {
    const url = request.nextUrl.clone();
    url.pathname = "/denied";
    return NextResponse.redirect(url);
  }

  // Already logged in, redirect away from login page
  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
