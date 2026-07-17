import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";

// Moderation report queue. Moderators+ only.
export async function GET() {
  const guard = await requireRole("MODERATOR");
  if (!guard.ok) return guard.response;

  try {
    const reports = await prisma.report.findMany({
      where: { status: "PENDING" },
      include: {
        reporter: { select: { profile: { select: { username: true } } } },
        post: { select: { id: true, title: true, isDeleted: true } },
        comment: { select: { id: true, body: true, isDeleted: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ data: reports });
  } catch (err) {
    console.error("[moderation/reports GET]", err);
    return NextResponse.json({ error: "Could not load reports." }, { status: 500 });
  }
}

// Resolve a report (mark REVIEWED / ACTION_TAKEN / DISMISSED).
export async function PATCH(request: NextRequest) {
  const guard = await requireRole("MODERATOR");
  if (!guard.ok) return guard.response;

  const { id, status, moderatorRemark } = await request.json();
  const allowed = ["REVIEWED", "ACTION_TAKEN", "DISMISSED"];
  if (!id || !allowed.includes(status)) {
    return NextResponse.json({ error: "id and a valid status are required." }, { status: 400 });
  }
  const remark = typeof moderatorRemark === "string" ? moderatorRemark.trim().slice(0, 2000) : "";
  if (!remark) {
    return NextResponse.json({ error: "Moderator remark is required." }, { status: 400 });
  }

  await prisma.report.update({
    where: { id },
    data: { status, moderatorRemark: remark, resolvedById: guard.user.id, resolvedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
