import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { eraseDeletionFeedbackByEmail } from "@/lib/retention";

// Grievance / right-to-erasure tool. A former user (already deleted, can't log in)
// emails the Grievance Officer asking to erase the email they consented to retain.
// An admin/moderator runs this on their behalf. Admin-gated; keeps the anonymized
// feedback, erases only the identifier.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const erased = await eraseDeletionFeedbackByEmail(email);
  return NextResponse.json({ ok: true, erased });
}
