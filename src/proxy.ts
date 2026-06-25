import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

// Paths that must never be reachable, regardless of auth state.
// Return 404 (not 403) to avoid confirming path existence to scanners.
const BLOCKED = [
  /^\/.git(\/|$)/,
  /^\/\.env(\.|$)/,
  /^\/swagger\.json$/,
  /^\/openapi\.json$/,
  /^\/graphql$/,
];

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
  "X-DNS-Prefetch-Control": "off",
};

export async function proxy(request: NextRequest) {
  if (BLOCKED.some((re) => re.test(request.nextUrl.pathname))) {
    return new NextResponse(null, { status: 404 });
  }

  const response = await updateSession(request);

  Object.entries(SECURITY_HEADERS).forEach(([k, v]) =>
    response.headers.set(k, v)
  );

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
