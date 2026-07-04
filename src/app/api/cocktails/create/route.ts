import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logInteraction } from "@/lib/interactions";
import { rateLimit } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

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

// A write endpoint is a DoS magnet: each call does several DB round-trips, so a
// loop of them exhausts the connection pool and floods storage. Two app-level
// guards (rate per account + a hard ceiling on stored mixes). Note: in-memory
// rate limiting is per serverless instance — the durable defence is a Vercel
// WAF / Firewall rule on POST /api/cocktails/create.
const CREATE_LIMIT_PER_MIN = 8;
const MAX_MIXES_PER_USER = 100;

export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.isBanned) return NextResponse.json({ error: "Account suspended" }, { status: 403 });

  // Throttle bursts per account before touching the DB at all.
  if (!(await rateLimit(`cocktail-create:${me.id}`, CREATE_LIMIT_PER_MIN, 60_000))) {
    return NextResponse.json(
      { error: "You're creating mixes too fast. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
  if (!name) return NextResponse.json({ error: "Name your mix first" }, { status: 400 });

  const slugs: string[] = Array.isArray(body.ingredientSlugs)
    ? body.ingredientSlugs.filter((s: unknown): s is string => typeof s === "string").slice(0, 16)
    : [];
  if (!slugs.length) return NextResponse.json({ error: "Add at least one ingredient" }, { status: 400 });

  try {
    // Hard ceiling on stored mixes per account — caps unbounded row spam even if
    // the rate limiter is bypassed across instances.
    const mixCount = await prisma.cocktailCreation.count({
      where: { authorId: me.id, isCurated: false },
    });
    if (mixCount >= MAX_MIXES_PER_USER) {
      return NextResponse.json(
        { error: `You've reached the ${MAX_MIXES_PER_USER}-mix limit. Delete some to add more.` },
        { status: 409 },
      );
    }

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
    // ONE existence check, not a 50-iteration loop: take the clean slug if free,
    // else fall straight to a uuid suffix. The old loop fired up to 50 queries
    // per create — a connection-pool killer under write floods.
    const base = slugify(name) || "my-mix";
    const baseTaken = await prisma.cocktailCreation.findFirst({
      where: { slug: base },
      select: { id: true },
    });
    const slug = baseTaken ? `${base}-${crypto.randomUUID().slice(0, 8)}` : base;

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

    logInteraction({
      userId: me.id,
      interactionType: "CREATE_COCKTAIL",
      targetType: "MIXLAB",
      targetId: created.id,
      context: { name, ingredientCount: slugs.length, isPublic: body.isPublic === true },
    });

    return NextResponse.json({ data: created });
  } catch (err) {
    if (isPoolExhausted(err)) {
      console.warn("[api/cocktails/create] pool exhausted — 503 backoff");
      return poolBusyResponse();
    }
    console.error("[api/cocktails/create]", err);
    return NextResponse.json({ error: "Couldn't save your mix." }, { status: 500 });
  }
}
