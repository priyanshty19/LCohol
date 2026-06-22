import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { PrismaClient, IngredientCategory } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function isLocalDb(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocalDb(process.env.DATABASE_URL) ? false : { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

export const EDITORIAL_USERNAME = "sipstories";
const EDITORIAL_EMAIL = "editorial@sipstories.app";
const EDITORIAL_BIO = "Editorial picks — handpicked cocktails from India's best bars.";

const DATA_DIR = path.join(__dirname, "data");
const CURATED_FILES = ["india_cocktails.csv", "cocktails_india.csv"];
const SYNTHETIC_FILE = "cocktails_10k.csv";

type CsvRow = {
  name: string;
  category: string;
  ingredients: string;
  instructions: string;
  garnish: string;
  glass: string;
  source: string;
};

// ──────────────────────────────────────────────────────────────────
// Tiny RFC4180-ish CSV parser. Handles "quoted, fields" and escaped "" quotes.
// ──────────────────────────────────────────────────────────────────
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((v) => v.length > 0)) rows.push(row);
      row = [];
    } else {
      cell += c;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((v) => v.length > 0)) rows.push(row);
  }
  return rows;
}

function readCsv(file: string): CsvRow[] {
  const full = path.join(DATA_DIR, file);
  const text = fs.readFileSync(full, "utf8");
  const rows = parseCsv(text);
  const [, ...body] = rows;
  return body
    .filter((r) => r[0] && r[0].trim().length > 0)
    .map((r) => ({
      name: (r[0] ?? "").trim(),
      category: (r[1] ?? "").trim(),
      ingredients: (r[2] ?? "").trim(),
      instructions: (r[3] ?? "").trim(),
      garnish: (r[4] ?? "").trim(),
      glass: (r[5] ?? "").trim(),
      source: (r[6] ?? "").trim(),
    }));
}

// ──────────────────────────────────────────────────────────────────
// Ingredient helpers
// ──────────────────────────────────────────────────────────────────
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 110);
}

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

function normalizeIngredient(raw: string): string {
  let s = raw.trim();
  s = s.replace(/\(.*?\)/g, "").trim(); // drop parentheticals like "(equal parts)"
  s = s.replace(/\s+/g, " ");
  if (!s) return "";
  return titleCase(s);
}

function splitIngredients(cell: string): string[] {
  const sep = cell.includes(";") ? ";" : ",";
  return cell
    .split(sep)
    .map(normalizeIngredient)
    .filter((s) => s.length > 0 && s.length <= 100);
}

function classifyIngredient(name: string): IngredientCategory {
  const n = name.toLowerCase();
  if (/\b(ice|crushed ice)\b/.test(n)) return "ICE";
  if (/\b(peel|zest|sprig|leaf|wheel|wedge|flower|twist|chip|skewer|sliver|ribbon)\b/.test(n))
    return "GARNISH";
  if (/\b(bitters?|tincture)\b/.test(n)) return "BITTERS";
  if (/\b(syrup|cordial|honey|agave|jaggery|demerara|sugar|simple|grenadine)\b/.test(n))
    return "SYRUP";
  if (/\b(tonic|soda|cola|ginger beer|coconut water|kombucha|water)\b/.test(n)) return "MIXER";
  if (
    /\b(gin|vodka|rum|whisk|tequila|mezcal|brandy|cognac|pisco|absinthe|sake|vermouth|amaro|liqueur|wine|prosecco|beer|sherry|champagne|aperol|campari|scotch|bourbon|rye)\b/.test(n)
  )
    return "SPIRIT";
  if (/\b(juice|lime|lemon|orange|grapefruit|cranberry|pineapple|mango|passion|watermelon)\b/.test(n) && !/\b(peel|zest)\b/.test(n))
    return "JUICE";
  return "OTHER";
}

// ──────────────────────────────────────────────────────────────────
// Source bar matcher
// ──────────────────────────────────────────────────────────────────
type BarLite = { id: string; name: string; city: string };

function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function extractBarTokens(source: string): { name: string; city: string | null } {
  let raw = source.replace(/\(.*?\)/g, "").trim();
  raw = raw.split(/\bmenu\b/i)[0].trim();
  const parts = raw.split(/[–\-—]/).map((p) => p.trim()).filter(Boolean);
  const namePart = parts[0] ?? raw;
  const cityPart = parts[parts.length - 1] ?? "";
  const cityMatch = cityPart.match(/(Mumbai|Delhi|New Delhi|Bangalore|Bengaluru|Chennai|Hyderabad|Kolkata|Pune|Goa|Gurgaon|Gurugram|Noida)/i);
  return {
    name: normalizeForMatch(namePart),
    city: cityMatch ? cityMatch[1] : null,
  };
}

function findBar(source: string, bars: BarLite[]): string | null {
  const { name, city } = extractBarTokens(source);
  if (!name) return null;
  const head = name.split(" ").slice(0, 2).join(" ");
  const candidates = bars.filter((b) => {
    const bn = normalizeForMatch(b.name);
    return bn.startsWith(head) || bn.includes(head);
  });
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0].id;
  if (city) {
    const byCity = candidates.find((b) => normalizeForMatch(b.city).includes(city.toLowerCase()));
    if (byCity) return byCity.id;
  }
  return candidates[0].id;
}

// ──────────────────────────────────────────────────────────────────
// Editorial author
// ──────────────────────────────────────────────────────────────────
async function ensureEditorialUser(): Promise<string> {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: EDITORIAL_EMAIL }, { profile: { username: EDITORIAL_USERNAME } }] },
    select: { id: true, profile: { select: { id: true, bio: true } } },
  });
  if (existing) {
    if (!existing.profile) {
      await prisma.profile.create({
        data: { userId: existing.id, username: EDITORIAL_USERNAME, displayName: "SipStories", bio: EDITORIAL_BIO },
      });
    } else if (existing.profile.bio !== EDITORIAL_BIO) {
      await prisma.profile.update({ where: { id: existing.profile.id }, data: { bio: EDITORIAL_BIO } });
    }
    return existing.id;
  }
  const created = await prisma.user.create({
    data: {
      authId: EDITORIAL_EMAIL,
      email: EDITORIAL_EMAIL,
      dob: new Date("1990-01-01"),
      isVerified: true,
      consentedAt: new Date(),
      profile: {
        create: {
          username: EDITORIAL_USERNAME,
          displayName: "SipStories",
          bio: EDITORIAL_BIO,
        },
      },
    },
    select: { id: true },
  });
  return created.id;
}

// ──────────────────────────────────────────────────────────────────
// Ingredient + drink caches
// ──────────────────────────────────────────────────────────────────
type IngredientLite = { id: string; slug: string };
type DrinkLite = { id: string; slug: string };

async function loadIngredientCache(): Promise<Map<string, IngredientLite>> {
  const all = await prisma.ingredient.findMany({ select: { id: true, slug: true, name: true } });
  const map = new Map<string, IngredientLite>();
  for (const i of all) {
    map.set(i.slug, { id: i.id, slug: i.slug });
    // Also index by normalized name so we don't insert a duplicate with a different slug
    map.set(`name:${i.name.toLowerCase()}`, { id: i.id, slug: i.slug });
  }
  return map;
}

async function loadDrinkCache(): Promise<Map<string, DrinkLite>> {
  const all = await prisma.drink.findMany({ select: { id: true, slug: true } });
  return new Map(all.map((d) => [d.slug, d]));
}

async function ensureIngredient(
  name: string,
  cache: Map<string, IngredientLite>,
): Promise<IngredientLite> {
  const slug = slugify(name);
  const slugHit = cache.get(slug);
  if (slugHit) return slugHit;
  const nameKey = `name:${name.toLowerCase()}`;
  const nameHit = cache.get(nameKey);
  if (nameHit) {
    cache.set(slug, nameHit);
    return nameHit;
  }
  try {
    const created = await prisma.ingredient.upsert({
      where: { slug },
      update: {},
      create: { name: name.slice(0, 100), slug, category: classifyIngredient(name) },
      select: { id: true, slug: true },
    });
    cache.set(slug, created);
    cache.set(nameKey, created);
    return created;
  } catch (e: unknown) {
    // Race or pre-existing row with same name but different slug — fall back to lookup.
    const found = await prisma.ingredient.findFirst({
      where: { OR: [{ slug }, { name: name.slice(0, 100) }] },
      select: { id: true, slug: true },
    });
    if (found) {
      cache.set(slug, found);
      cache.set(nameKey, found);
      return found;
    }
    throw e;
  }
}

// ──────────────────────────────────────────────────────────────────
// Curated upsert path
// ──────────────────────────────────────────────────────────────────
async function seedCurated(
  rows: CsvRow[],
  authorId: string,
  bars: BarLite[],
  ingCache: Map<string, IngredientLite>,
  drinkCache: Map<string, DrinkLite>,
): Promise<{ inserted: number; unmatchedBars: Set<string> }> {
  let inserted = 0;
  const unmatchedBars = new Set<string>();

  for (const row of rows) {
    const sourceBarId = findBar(row.source, bars);
    if (!sourceBarId) unmatchedBars.add(row.source);

    const upserted = await prisma.cocktailCreation.upsert({
      where: {
        authorId_name_sourceLabel: {
          authorId,
          name: row.name,
          sourceLabel: row.source,
        },
      },
      update: {
        category: row.category || null,
        glass: row.glass || null,
        garnish: row.garnish || null,
        instructions: row.instructions || null,
        sourceBarId,
        isCurated: true,
      },
      create: {
        authorId,
        name: row.name,
        category: row.category || null,
        glass: row.glass || null,
        garnish: row.garnish || null,
        instructions: row.instructions || null,
        sourceBarId,
        sourceLabel: row.source,
        isCurated: true,
        isPublic: true,
      },
      select: { id: true, ingredients: { select: { id: true } } },
    });

    if (upserted.ingredients.length === 0) {
      const parts = splitIngredients(row.ingredients);
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const ing = await ensureIngredient(part, ingCache);
        const drink = drinkCache.get(slugify(part));
        await prisma.cocktailIngredient.create({
          data: {
            cocktailId: upserted.id,
            ingredientId: ing.id,
            drinkId: drink?.id ?? null,
            sortOrder: i,
          },
        });
      }
      inserted++;
    }
  }

  return { inserted, unmatchedBars };
}

// ──────────────────────────────────────────────────────────────────
// Synthetic createMany path
// ──────────────────────────────────────────────────────────────────
async function seedSynthetic(
  rows: CsvRow[],
  authorId: string,
  bars: BarLite[],
  ingCache: Map<string, IngredientLite>,
  drinkCache: Map<string, DrinkLite>,
): Promise<number> {
  // Pre-warm ingredient cache: collect unique ingredients across all synthetic rows.
  const uniqueParts = new Set<string>();
  for (const r of rows) splitIngredients(r.ingredients).forEach((p) => uniqueParts.add(p));
  for (const p of uniqueParts) await ensureIngredient(p, ingCache);

  // Skip rows that already exist (idempotent re-runs).
  const existingNames = new Set(
    (
      await prisma.cocktailCreation.findMany({
        where: { authorId, isCurated: false },
        select: { name: true },
      })
    ).map((r) => r.name),
  );
  const fresh = rows.filter((r) => !existingNames.has(r.name));
  if (fresh.length === 0) return 0;

  const BATCH = 500;
  let total = 0;
  for (let i = 0; i < fresh.length; i += BATCH) {
    const chunk = fresh.slice(i, i + BATCH);
    // Bulk insert cocktails, then re-fetch by (authorId,name) to get IDs.
    await prisma.cocktailCreation.createMany({
      data: chunk.map((r) => ({
        authorId,
        name: r.name,
        category: r.category || null,
        glass: r.glass || null,
        garnish: r.garnish || null,
        instructions: r.instructions || null,
        sourceBarId: findBar(r.source, bars),
        sourceLabel: r.source,
        isCurated: false,
        isPublic: true,
      })),
      skipDuplicates: true,
    });

    const created = await prisma.cocktailCreation.findMany({
      where: { authorId, isCurated: false, name: { in: chunk.map((r) => r.name) } },
      select: { id: true, name: true },
    });
    const idByName = new Map(created.map((c) => [c.name, c.id]));

    const joinRows: { cocktailId: string; ingredientId: string; drinkId: string | null; sortOrder: number }[] = [];
    for (const r of chunk) {
      const cocktailId = idByName.get(r.name);
      if (!cocktailId) continue;
      const parts = splitIngredients(r.ingredients);
      for (let j = 0; j < parts.length; j++) {
        const ing = ingCache.get(slugify(parts[j]));
        if (!ing) continue;
        const drink = drinkCache.get(slugify(parts[j]));
        joinRows.push({ cocktailId, ingredientId: ing.id, drinkId: drink?.id ?? null, sortOrder: j });
      }
    }
    if (joinRows.length > 0) {
      await prisma.cocktailIngredient.createMany({ data: joinRows, skipDuplicates: true });
    }
    total += chunk.length;
    process.stdout.write(`   synthetic batch ${i + chunk.length}/${fresh.length}\r`);
  }
  process.stdout.write("\n");
  return total;
}

// ──────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────
async function main() {
  console.log("🍸 Seeding cocktails…");

  const authorId = await ensureEditorialUser();
  console.log(`   editorial author: ${EDITORIAL_USERNAME} (${authorId})`);

  const barsRaw = await prisma.bar.findMany({ select: { id: true, name: true, city: true } });
  console.log(`   loaded ${barsRaw.length} bars for source matching`);
  const bars: BarLite[] = barsRaw;

  const ingCache = await loadIngredientCache();
  const drinkCache = await loadDrinkCache();
  console.log(`   ingredient cache: ${ingCache.size}, drink cache: ${drinkCache.size}`);

  // Curated
  const curatedRows = CURATED_FILES.flatMap((f) => readCsv(f));
  console.log(`   curated rows: ${curatedRows.length}`);
  const { inserted: curatedInserted, unmatchedBars } = await seedCurated(
    curatedRows,
    authorId,
    bars,
    ingCache,
    drinkCache,
  );
  console.log(`   ✓ curated upserted (${curatedInserted} fresh inserts, ${curatedRows.length - curatedInserted} updates)`);

  // Synthetic
  const syntheticRows = readCsv(SYNTHETIC_FILE);
  console.log(`   synthetic rows: ${syntheticRows.length}`);
  const syntheticInserted = await seedSynthetic(syntheticRows, authorId, bars, ingCache, drinkCache);
  console.log(`   ✓ synthetic inserted: ${syntheticInserted}`);

  // Report
  const totals = await prisma.cocktailCreation.groupBy({
    by: ["isCurated"],
    where: { authorId },
    _count: { _all: true },
  });
  console.log("\n📊 totals (sipstories author):");
  totals.forEach((t) => console.log(`   isCurated=${t.isCurated}: ${t._count._all}`));

  if (unmatchedBars.size > 0) {
    console.log(`\n⚠ unmatched source bars (${unmatchedBars.size}) — extend prisma/seed-bars.ts:`);
    for (const s of Array.from(unmatchedBars).slice(0, 30)) console.log(`   • ${s}`);
    if (unmatchedBars.size > 30) console.log(`   …and ${unmatchedBars.size - 30} more`);
  }

  console.log("\n✅ Done.");
}

main()
  .catch((e) => {
    console.error("❌ Cocktails seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
