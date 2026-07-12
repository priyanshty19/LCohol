import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/verify-age",
  "/compliance",
  "/denied",
];

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)
  ) {
    return NextResponse.next({ request });
  }

  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const email = (token ? await verifySessionToken(token) : null)?.email ?? null;

  if (isPublic) {
    if ((pathname === "/login" || pathname === "/signup") && email) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  if (!email) {
    if (pathname.startsWith("/api")) return NextResponse.next({ request });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
