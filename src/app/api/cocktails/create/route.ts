import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logInteraction } from "@/lib/interactions";
import { rateLimit } from "@/lib/rate-limit";
import { containsProfanity } from "@/lib/profanity";
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

const NANOID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

function nanoid(size = 10): string {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => NANOID_ALPHABET[b % NANOID_ALPHABET.length]).join("");
}

function mixSlug(name: string): string {
  const suffix = nanoid().toLowerCase();
  const base = slugify(name).slice(0, 220 - suffix.length - 1) || "my-mix";
  return `${base}-${suffix}`;
}

function sanitizeImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const storageHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
    const image = new URL(value);
    return storageHost && image.protocol === "https:" && image.hostname === storageHost &&
      image.pathname.startsWith("/storage/v1/object/public/post-images/")
      ? image.toString()
      : null;
  } catch {
    return null;
  }
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
  // Names surface publicly (shared posts, "Loved by your circle", recipe pages),
  // so block blatant profanity/slurs at the door.
  if (containsProfanity(name)) {
    return NextResponse.json(
      { error: "Please pick a cleaner name for your mix." },
      { status: 400 },
    );
  }

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

    // Resolve ingredient slugs → ids (preserve the order the user layered them).
    const ingredients = await prisma.ingredient.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true },
    });
    const bySlug = new Map(ingredients.map((i) => [i.slug, i.id]));
    if (bySlug.size === 0) {
      return NextResponse.json({ error: "None of those ingredients were recognized" }, { status: 400 });
    }

    const data = {
      authorId: me.id,
      name,
      glass: typeof body.glass === "string" ? body.glass.slice(0, 80) : null,
      garnish: typeof body.garnish === "string" ? body.garnish.slice(0, 200) : null,
      category: "My Mix",
      categorySlug: "my-mix",
      imageUrl: sanitizeImageUrl(body.imageUrl),
      isCurated: false,
      isPublic: body.isPublic === true,
      ingredients: {
        create: slugs
          .map((s, idx) => ({ ingredientId: bySlug.get(s), sortOrder: idx }))
          .filter((row): row is { ingredientId: string; sortOrder: number } => !!row.ingredientId),
      },
    };

    let created: { id: string; slug: string | null } | null = null;
    for (let tries = 0; tries < 2; tries++) {
      try {
        created = await prisma.cocktailCreation.create({
          data: { ...data, slug: mixSlug(name) },
          select: { id: true, slug: true },
        });
        break;
      } catch (err) {
        if ((err as { code?: string }).code !== "P2002" || tries === 1) throw err;
      }
    }
    if (!created) throw new Error("Cocktail creation failed");

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
