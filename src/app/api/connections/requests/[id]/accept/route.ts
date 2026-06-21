import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { createConnectionTx } from "@/lib/connections";

// POST /api/connections/requests/[id]/accept — recipient accepts → forms the
// mutual connection. Atomic: claim the PENDING request, then create the link.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("USER");
  if (!guard.ok) return guard.response;
  const me = guard.user.id;
  const { id } = await params;

  try {
    const req = await prisma.connectionRequest.findUnique({
      where: { id },
      select: { id: true, fromUserId: true, toUserId: true, status: true },
    });
    if (!req || req.toUserId !== me) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }
    if (req.status !== "PENDING") {
      return NextResponse.json({ error: "This request was already handled." }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.connectionRequest.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });
      if (claimed.count === 0) throw new Error("already handled");
      await createConnectionTx(tx, req.fromUserId, req.toUserId);
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    console.error("[api/connections/requests accept]", err);
    return NextResponse.json({ error: "Couldn't accept request." }, { status: 500 });
  }
}
