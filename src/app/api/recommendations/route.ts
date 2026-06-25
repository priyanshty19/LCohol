import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getRecommendations } from "@/lib/behavior";

// Personalized drink recommendations for the current user (taste-ranked, popular
// fallback). Logged-out → empty so the rail simply hides.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ drinks: [] });
  const drinks = await getRecommendations(user.id);
  return NextResponse.json({ drinks });
}
