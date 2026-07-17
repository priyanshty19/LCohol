import { NextResponse } from "next/server";
import { ReportReason, type ReportReason as ReportReasonValue } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

const REPORT_REASONS = new Set<string>(Object.values(ReportReason));

function isReportReason(value: unknown): value is ReportReasonValue {
  return typeof value === "string" && REPORT_REASONS.has(value);
}

export async function POST(request: Request) {
  const dbUser = await getCurrentUser();
  if (!dbUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Match sibling mutation routes: banned users cannot act, and cap report
  // volume so the moderation queue can't be flooded.
  if (dbUser.isBanned) {
    return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  }
  if (!(await rateLimit(`report:${dbUser.id}`, 15, 60_000))) {
    return NextResponse.json(
      { error: "You're reporting too fast — give it a moment." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const postId = typeof body.postId === "string" ? body.postId : null;
  const commentId = typeof body.commentId === "string" ? body.commentId : null;
  const reason = typeof body.reason === "string" ? body.reason : null;
  const details = typeof body.details === "string" ? body.details : null;
  const rawReasons = Array.isArray(body.reasons) ? body.reasons : reason ? [reason] : [];
  const reasons = Array.from(new Set(rawReasons.filter(isReportReason)));

  if (reasons.length < 1 || reasons.length > 3) {
    return NextResponse.json({ error: "Choose 1 to 3 valid reasons" }, { status: 400 });
  }

  // `reason` is a ReportReason enum (Prisma validates it at write); only the
  // free-text `details` needs a length cap.
  const cappedDetails = details ? details.slice(0, 2000) : null;

  // Exactly one target — not both, not neither.
  if (!postId === !commentId) {
    return NextResponse.json(
      { error: "Report exactly one post or comment" },
      { status: 400 }
    );
  }

  try {
    // Hard ceiling per account so the moderation queue can't be row-spammed
    // even if the rate limiter is bypassed across instances.
    const reportCount = await prisma.report.count({
      where: { reporterId: dbUser.id },
    });
    if (reportCount >= 200) {
      return NextResponse.json(
        { error: "You've filed too many reports. Please contact support." },
        { status: 409 }
      );
    }

    const report = await prisma.report.create({
      data: {
        reporterId: dbUser.id,
        postId: postId || null,
        commentId: commentId || null,
        reason: reasons[0],
        reasons,
        details: cappedDetails,
      },
    });

    return NextResponse.json({ data: { id: report.id } }, { status: 201 });
  } catch (err) {
    if (isPoolExhausted(err)) {
      console.warn("[api/moderation/report] pool exhausted — 503 backoff");
      return poolBusyResponse();
    }
    console.error("[api/moderation/report]", err);
    return NextResponse.json({ error: "Couldn't file your report." }, { status: 500 });
  }
}
