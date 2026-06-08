import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_USERS, SHARED_PASSWORD, findAllowedUser } from "@/lib/allowed-users";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required." }, { status: 400 });
    }

    // Check password first
    if (password !== SHARED_PASSWORD) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Check if email is in the allowlist
    const allowedUser = findAllowedUser(email);
    if (!allowedUser) {
      return NextResponse.json(
        { error: "Access denied. This is a private beta — you are not on the guest list." },
        { status: 403 }
      );
    }

    // Find or create the user in our DB
    let dbUser = await prisma.user.findFirst({
      where: { email: allowedUser.email },
      include: { profile: true },
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          authId: allowedUser.email, // use email as authId
          email: allowedUser.email,
          dob: allowedUser.dob,
          isVerified: true,
          profile: {
            create: {
              username: allowedUser.username,
              displayName: allowedUser.displayName,
            },
          },
        },
        include: { profile: true },
      });
    }

    // Create session token and set cookie
    const token = await createSessionToken(allowedUser.email);
    const response = NextResponse.json({
      ok: true,
      user: {
        email: allowedUser.email,
        username: allowedUser.username,
        displayName: allowedUser.displayName,
      },
    });

    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}

// Unused but exported to prevent unused import of ALLOWED_USERS warning
export { ALLOWED_USERS };
