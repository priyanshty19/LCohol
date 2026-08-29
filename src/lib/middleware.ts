import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { safeReturnTo } from "@/lib/safe-return-to";

const PUBLIC_ROUTES = new Set([
  "/login",
  "/signup",
  "/verify-age",
  "/Terms-and-Condition",
  "/Privacy-Policy",
  "/denied",
  "/opengraph-image",
]);

const PUBLIC_PREFIXES = ["/party/"];

export async function updateSession(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)
  ) {
    return NextResponse.next({ request });
  }

  const isPublic =
    PUBLIC_ROUTES.has(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const email = (token ? await verifySessionToken(token) : null)?.email ?? null;

  // Serve the existing landing experience at the canonical root URL without
  // moving the signed-in feed. A rewrite keeps `/` as a crawlable 200 page,
  // while authenticated members continue to receive the feed at `/`.
  if (pathname === "/" && !email) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-sipstories-public-home", "1");
    return NextResponse.rewrite(new URL("/login", request.url), {
      request: { headers: requestHeaders },
    });
  }

  if (isPublic) {
    if ((pathname === "/login" || pathname === "/signup") && email) {
      const destination = safeReturnTo(request.nextUrl.searchParams.get("returnTo"));
      return NextResponse.redirect(new URL(destination, request.url));
    }
    return NextResponse.next({ request });
  }

  if (!email) {
    if (pathname.startsWith("/api")) return NextResponse.next({ request });
    const url = new URL("/login", request.url);
    url.searchParams.set("returnTo", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
