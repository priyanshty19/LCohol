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
export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const feedback = typeof body.feedback === "string" ? body.feedback.trim().slice(0, 2000) : null;
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 80) : null;
  const keepEmail = body.keepEmail === true;

  // Capture exit feedback BEFORE the purge (the user row is about to vanish). This
  // record is intentionally orphaned — it has no FK to User, so the cascade below
  // won't delete it. Email is stored ONLY with explicit consent (keepEmail); without
  // it we keep just the anonymized feedback. Best-effort: never blocks deletion.
  if (feedback || reason || keepEmail) {
    try {
      await prisma.accountDeletionFeedback.create({
        data: {
          email: keepEmail ? user.email : null,
          feedback,
          reason,
          emailConsent: keepEmail,
        },
      });
    } catch (e) {
      console.error("[account delete] feedback capture failed", e);
    }
  }

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
