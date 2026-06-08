import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { findAllowedUser } from "@/lib/allowed-users";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ user: null });

  const email = await verifySessionToken(token);
  if (!email) return NextResponse.json({ user: null });

  const allowedUser = findAllowedUser(email);
  if (!allowedUser) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: {
      email: allowedUser.email,
      username: allowedUser.username,
      displayName: allowedUser.displayName,
    },
  });
}
