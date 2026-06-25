import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// POST /api/cocktails/create
//   { name, glass?, garnish?, isPublic?, ingredientSlugs: string[] }
//   Saves a user-built mix as a private (or public) CocktailCreation + its
//   CocktailIngredient layers (sortOrder = pour order). Powers "My Mixes".
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
  if (!name) return NextResponse.json({ error: "Name your mix first" }, { status: 400 });

  const slugs: string[] = Array.isArray(body.ingredientSlugs)
    ? body.ingredientSlugs.filter((s: unknown): s is string => typeof s === "string").slice(0, 16)
    : [];
  if (!slugs.length) return NextResponse.json({ error: "Add at least one ingredient" }, { status: 400 });

  // Reject a duplicate name by the same author up front (matches @@unique
  // [authorId, name, sourceLabel] with sourceLabel null) for a friendly message.
  const clash = await prisma.cocktailCreation.findFirst({
    where: { authorId: me.id, name, sourceLabel: null },
    select: { id: true },
  });
  if (clash) {
    return NextResponse.json({ error: "You already have a mix with that name" }, { status: 409 });
  }

  // Resolve ingredient slugs → ids (preserve the order the user layered them).
  const ingredients = await prisma.ingredient.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });
  const bySlug = new Map(ingredients.map((i) => [i.slug, i.id]));
  if (bySlug.size === 0) {
    return NextResponse.json({ error: "None of those ingredients were recognized" }, { status: 400 });
  }

  // Unique-in-practice slug (the column isn't a DB UNIQUE; see catalog memo).
  const base = slugify(name) || "my-mix";
  let slug = base;
  for (let n = 2; n < 50; n++) {
    const taken = await prisma.cocktailCreation.findFirst({ where: { slug }, select: { id: true } });
    if (!taken) break;
    slug = `${base}-${n}`;
  }
  // Fallback if the base collided through the whole loop — guarantee uniqueness.
  const stillTaken = await prisma.cocktailCreation.findFirst({ where: { slug }, select: { id: true } });
  if (stillTaken) slug = `${base}-${crypto.randomUUID().slice(0, 8)}`;

  const created = await prisma.cocktailCreation.create({
    data: {
      authorId: me.id,
      name,
      slug,
      glass: typeof body.glass === "string" ? body.glass.slice(0, 80) : null,
      garnish: typeof body.garnish === "string" ? body.garnish.slice(0, 200) : null,
      category: "My Mix",
      categorySlug: "my-mix",
      isCurated: false,
      isPublic: body.isPublic === true,
      ingredients: {
        create: slugs
          .map((s, idx) => ({ ingredientId: bySlug.get(s), sortOrder: idx }))
          .filter((row): row is { ingredientId: string; sortOrder: number } => !!row.ingredientId),
      },
    },
    select: { id: true, slug: true },
  });

  return NextResponse.json({ data: created });
}
