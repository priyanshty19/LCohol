/**
 * Fill Drink.imageUrl from Unsplash.
 *
 * Why Unsplash and not a bottle-shot source: the Unsplash License permits
 * commercial use with no attribution required, so nothing here carries a credit
 * obligation the schema cannot store. images.unsplash.com is already allowed by
 * the CSP and next/image remotePatterns, so no config change is needed either.
 *
 * Why the query is per CATEGORY and never per brand: Unsplash indexes stock
 * photography, not product catalogues. Searching "Imperial Blue" returns blue
 * abstracts and "Old Monk" returns monks. A category query returns an on-subject
 * pour every time, so each drink gets a tasteful representative image rather
 * than a confidently wrong one. Photos are dealt out so drinks in the same
 * category do not repeat.
 *
 * Needs UNSPLASH_ACCESS_KEY in .env (free: https://unsplash.com/developers).
 *
 * Dry run (default, writes nothing):
 *   npx tsx scripts/backfill-drink-images.mts
 * Apply:
 *   npx tsx scripts/backfill-drink-images.mts --apply
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APPLY = process.argv.includes("--apply");
const KEY = process.env.UNSPLASH_ACCESS_KEY;

if (!KEY) {
  console.error(
    "UNSPLASH_ACCESS_KEY is not set.\n" +
      "Create a free app at https://unsplash.com/developers, copy the Access Key,\n" +
      'then add  UNSPLASH_ACCESS_KEY="..."  to .env',
  );
  process.exit(1);
}

/** Search terms tuned to return a drink in a glass, not a brand or a bar. */
const CATEGORY_QUERY: Record<string, string> = {
  Whisky: "whisky glass neat pour",
  Beer: "beer glass pour",
  Rum: "dark rum cocktail glass",
  Gin: "gin and tonic glass",
  Vodka: "vodka cocktail glass",
  Wine: "wine glass pour",
  Tequila: "tequila glass lime",
  Liqueur: "liqueur glass cream",
  Brandy: "brandy snifter glass",
  "Soft Drinks": "cola glass ice",
};
const FALLBACK_QUERY = "cocktail glass bar";

type Photo = { url: string; downloadLocation: string; credit: string };

async function fetchPhotos(query: string, count: number): Promise<Photo[]> {
  const url =
    "https://api.unsplash.com/search/photos?" +
    new URLSearchParams({
      query,
      per_page: String(Math.min(30, Math.max(count, 10))),
      orientation: "squarish",
      content_filter: "high",
    });

  const r = await fetch(url, {
    headers: { Authorization: `Client-ID ${KEY}`, "Accept-Version": "v1" },
  });
  if (!r.ok) {
    // Surfaced rather than swallowed: a 403 here means the rate limit is spent
    // (50/hour on a demo app), which is otherwise indistinguishable from
    // "no photos for this category".
    throw new Error(`Unsplash search failed for "${query}": HTTP ${r.status} ${await r.text()}`);
  }
  const j = (await r.json()) as {
    results?: {
      urls?: { regular?: string };
      links?: { download_location?: string };
      user?: { name?: string };
    }[];
  };
  return (j.results ?? [])
    .filter((p) => p.urls?.regular)
    .map((p) => ({
      url: p.urls!.regular!,
      downloadLocation: p.links?.download_location ?? "",
      credit: p.user?.name ?? "Unsplash",
    }));
}

/** Unsplash's API guidelines ask that a use be reported to this endpoint. */
async function reportDownload(loc: string) {
  if (!loc) return;
  try {
    await fetch(loc, { headers: { Authorization: `Client-ID ${KEY}` } });
  } catch {
    /* best effort; never block the backfill on the analytics ping */
  }
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  }),
});

const drinks = await prisma.drink.findMany({
  where: { imageUrl: null },
  select: { id: true, name: true, category: { select: { name: true } } },
  orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
});

console.log(`${drinks.length} drinks without an image. ${APPLY ? "APPLYING" : "DRY RUN (no writes)"}\n`);

// Group by category so each category costs exactly one search request.
const byCategory = new Map<string, typeof drinks>();
for (const d of drinks) {
  const list = byCategory.get(d.category.name) ?? [];
  list.push(d);
  byCategory.set(d.category.name, list);
}

let written = 0;
const short: string[] = [];

for (const [category, list] of byCategory) {
  const query = CATEGORY_QUERY[category] ?? FALLBACK_QUERY;
  const photos = await fetchPhotos(query, list.length);
  console.log(`${category} (${list.length} drinks) — "${query}" → ${photos.length} photos`);

  if (photos.length < list.length) {
    short.push(`${category}: ${photos.length} photos for ${list.length} drinks (some will repeat)`);
  }

  for (let i = 0; i < list.length; i++) {
    const d = list[i];
    const photo = photos[i % photos.length];
    if (!photo) {
      console.log(`   ${d.name} — no photo available`);
      continue;
    }
    console.log(`   ${d.name} ← ${photo.credit}`);
    if (APPLY) {
      await prisma.drink.update({ where: { id: d.id }, data: { imageUrl: photo.url } });
      await reportDownload(photo.downloadLocation);
    }
    written++;
  }
  console.log("");
}

console.log("─".repeat(60));
console.log(`${APPLY ? "written" : "would write"}: ${written} / ${drinks.length}`);
for (const s of short) console.log(`note: ${s}`);

await prisma.$disconnect();
