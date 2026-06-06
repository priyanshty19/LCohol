import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { username },
    include: {
      user: {
        select: {
          createdAt: true,
          _count: { select: { posts: true, comments: true } },
        },
      },
      favoriteDrink: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ data: profile });
}

export async function PATCH(request: Request) {
  const dbUser = await getCurrentUser();
  if (!dbUser || !dbUser.profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { displayName, bio, drinkingStyle, city, state } = body;

  const updated = await prisma.profile.update({
    where: { id: dbUser.profile.id },
    data: {
      ...(displayName !== undefined ? { displayName } : {}),
      ...(bio !== undefined ? { bio } : {}),
      ...(drinkingStyle !== undefined ? { drinkingStyle } : {}),
      ...(city !== undefined ? { city } : {}),
      ...(state !== undefined ? { state } : {}),
    },
  });

  return NextResponse.json({ data: updated });
}
