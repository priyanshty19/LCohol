import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Paths that must never be reachable, regardless of auth state.
// Return 404 (not 403) to avoid confirming path existence to scanners.
const BLOCKED = [
  /^\/.git(\/|$)/,
  /^\/\.env(\.|$)/,
  /^\/swagger\.json$/,
  /^\/openapi\.json$/,
  /^\/graphql$/,
];

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "off",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (BLOCKED.some((re) => re.test(pathname))) {
    return new NextResponse(null, { status: 404 });
  }

  const response = await updateSession(request);

  Object.entries(SECURITY_HEADERS).forEach(([k, v]) =>
    response.headers.set(k, v)
  );

  return response;
}

export const config = {
  // Run on all routes except Next.js internals and static file extensions.
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
