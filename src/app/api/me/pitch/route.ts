import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getBehaviorProfile, pickRetentionPitch } from "@/lib/behavior";

// The personalized retention pitch for the current user — the under-used feature
// most worth pitching, chosen from their behavior. Used by the delete-flow nudge.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pitch = pickRetentionPitch(await getBehaviorProfile(user.id));
  return NextResponse.json({ pitch });
}
