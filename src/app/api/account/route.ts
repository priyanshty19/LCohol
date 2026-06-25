import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { clerkBackend } from "@/lib/clerk";

// Permanently delete the current user and ALL their data. Irreversible.
//
// Deleting the User row cascades to everything they own — profile, posts,
// comments, votes, parties, party suggestions/votes, connections, requests,
// reviews, mentions, notifications, push subscriptions, etc. (every required
// relation is onDelete: Cascade; optional back-refs like invitedBy / notification
// actor are SetNull). Then we clear the session cookie so the browser is logged
// out immediately.
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Best-effort: remove the Clerk user that holds this email (Clerk is used only
  // for OTP delivery). Never block account deletion on a Clerk-side failure.
  if (process.env.CLERK_SECRET_KEY) {
    try {
      const { data } = await clerkBackend.users.getUserList({ emailAddress: [user.email] });
      await Promise.all(data.map((u) => clerkBackend.users.deleteUser(u.id)));
    } catch (e) {
      console.error("[account delete] clerk cleanup failed", e);
    }
  }

  await prisma.user.delete({ where: { id: user.id } });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
  return res;
}
