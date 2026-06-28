import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { canonicalizeEmail } from "@/lib/email-normalize";
import { isAdminEmail } from "@/lib/rbac";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    if (!rateLimit(`login:${clientIp(request)}`, 10, 60_000)) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a minute." },
        { status: 429 }
      );
    }
    const body = await request.json();
    const email = canonicalizeEmail(
      typeof body.email === "string" ? body.email.slice(0, 320) : body.email
    );
    // Cap password length: an oversized input makes the hash verify CPU-bound.
    const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { email },
      include: { profile: true },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (user.isBanned) {
      return NextResponse.json(
        { error: "This account has been suspended." },
        { status: 403 }
      );
    }

    // Reconcile global-admin role from env on every login (idempotent).
    if (isAdminEmail(email) && user.role !== "ADMIN") {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "ADMIN" },
      });
    }

    const token = await createSessionToken(email, user.tokenEpoch);
    const response = NextResponse.json({
      ok: true,
      user: { email, username: user.profile?.username ?? null },
    });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (err) {
    if (isPoolExhausted(err)) return poolBusyResponse();
    console.error("[auth/login]", err);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
