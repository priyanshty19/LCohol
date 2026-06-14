import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: {
      email: user.email,
      username: user.profile?.username ?? null,
      displayName: user.profile?.displayName ?? user.profile?.username ?? null,
      role: user.role,
      isBanned: user.isBanned,
      emergencyPhone: user.profile?.emergencyPhone ?? null,
      theme: user.profile?.theme ?? "light",
      state: user.profile?.state ?? null,
      preferredSpirits: user.profile?.preferredSpirits ?? [],
    },
  });
}
