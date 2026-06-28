import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { eraseDeletionFeedbackByEmail } from "@/lib/retention";
import { rateLimit } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

// Grievance / right-to-erasure tool. A former user (already deleted, can't log in)
// emails the Grievance Officer asking to erase the email they consented to retain.
// An admin/moderator runs this on their behalf. Admin-gated; keeps the anonymized
// feedback, erases only the identifier.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (user.isBanned) return NextResponse.json({ error: "Account suspended" }, { status: 403 });

  if (!rateLimit(`erase-feedback:${user.id}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.toLowerCase().trim().slice(0, 254) : "";
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  try {
    const erased = await eraseDeletionFeedbackByEmail(email);
    return NextResponse.json({ ok: true, erased });
  } catch (err) {
    if (isPoolExhausted(err)) return poolBusyResponse();
    console.error("[api/admin/erase-feedback]", err);
    return NextResponse.json({ error: "Couldn't erase feedback." }, { status: 500 });
  }
}
