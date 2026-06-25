// Pure helpers for normalizing the free-text cocktail `category` (sourced from
// the CSV) into a stable, controlled `categorySlug`. Kept dependency-free so it
// can be imported by both the app (server components / API routes) and the
// one-off backfill script (run via tsx outside Next).
//
// This is the pragmatic v1 of the "category reconciliation" called out in the
// plan: we do NOT merge cocktail categories into the drink taxonomy (a cocktail's
// theme like "Modern Classic" isn't a spirit type). We just collapse synonyms and
// slugify so the filter axis is consistent instead of raw uncontrolled strings.

export function slugifyCategory(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Small alias map collapsing common CSV variants onto one canonical slug.
// Extend as real data surfaces; unknown values fall through to slugifyCategory.
const ALIASES: Record<string, string> = {
  "classic signature": "classic",
  "classic cocktail": "classic",
  classics: "classic",
  "the icons": "icons",
  icon: "icons",
  "modern classic": "modern",
  "modern cocktail": "modern",
  contemporary: "modern",
  "south inspired": "regional",
  "north inspired": "regional",
  "india inspired": "regional",
  regional: "regional",
  "spirit forward": "spirit-forward",
  "spirit-forward": "spirit-forward",
  refreshing: "refreshing",
  refresher: "refreshing",
  tropical: "tropical",
  tiki: "tropical",
};

export function normalizeCocktailCategory(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!key) return null;
  if (ALIASES[key]) return ALIASES[key];
  const slug = slugifyCategory(key);
  return slug || null;
}
