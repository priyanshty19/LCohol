import type { InteractionType } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Engagement weights — how strongly each signal implies preference.
// ---------------------------------------------------------------------------
export const INTERACTION_WEIGHT: Partial<Record<InteractionType, number>> = {
  VIEW: 1,
  CLICK_DRINK: 1.5,
  BOOKMARK: 4,
  CREATE_COCKTAIL: 5,
  UPVOTE: 2,
  SHARE: 3,
};
export const CLICK_DRINK_WEIGHT = INTERACTION_WEIGHT.CLICK_DRINK ?? 1.5;
export const FAVORITE_WEIGHT = 6;
// 1★ → 0, 3★ → 1, 5★ → 3 (low ratings carry no positive preference signal).
export function reviewWeight(rating: number): number {
  return Math.max(0, rating - 2);
}

// ---------------------------------------------------------------------------
// Content features — a drink's categorical "fingerprint".
// ---------------------------------------------------------------------------
export type Vector = Record<string, number>;

export const DRINK_FEATURE_SELECT = {
  id: true,
  slug: true,
  category: { select: { name: true } },
  subcategory: { select: { name: true } },
  moods: { select: { mood: true } },
  occasions: { select: { occasion: true } },
  priceRange: true,
  country: true,
} as const;

type DrinkFeatureShape = {
  category?: { name: string } | null;
  subcategory?: { name: string } | null;
  moods?: { mood: string }[];
  occasions?: { occasion: string }[];
  priceRange?: string | null;
  country?: string | null;
};

export function drinkFeatureTokens(d: DrinkFeatureShape): string[] {
  const t: string[] = [];
  if (d.category?.name) t.push(`cat:${d.category.name}`);
  if (d.subcategory?.name) t.push(`sub:${d.subcategory.name}`);
  for (const m of d.moods ?? []) t.push(`mood:${m.mood}`);
  for (const o of d.occasions ?? []) t.push(`occ:${o.occasion}`);
  if (d.priceRange) t.push(`price:${d.priceRange}`);
  if (d.country) t.push(`country:${d.country}`);
  return t;
}

export function tokensToVector(tokens: string[]): Vector {
  const v: Vector = {};
  for (const t of tokens) v[t] = (v[t] ?? 0) + 1;
  return v;
}

// Cosine similarity between two sparse vectors (0..1).
export function cosine(a: Vector, b: Vector): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const k in a) {
    na += a[k] * a[k];
    if (k in b) dot += a[k] * b[k];
  }
  for (const k in b) nb += b[k] * b[k];
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
