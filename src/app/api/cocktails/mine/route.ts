import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMyCocktails } from "@/lib/cocktails";

// GET /api/cocktails/mine → the signed-in user's saved mixes (newest first).
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cocktails = await getMyCocktails(me.id);
  return NextResponse.json({ data: { cocktails } });
}
