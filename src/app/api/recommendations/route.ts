import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { recommendDrinks } from "@/lib/recommend";

// Personalized drink recommendations — the HYBRID recommender (collaborative +
// content + popularity). Logged-out → empty so the rail simply hides.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ drinks: [] });
  const drinks = await recommendDrinks(user.id);
  return NextResponse.json({ drinks });
}
