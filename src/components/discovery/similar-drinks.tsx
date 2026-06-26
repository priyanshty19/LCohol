"use client";

import { DrinkRail } from "./drink-rail";

// "More like this" rail on a drink page — item-item collaborative neighbours of the
// drink (with a same-category content fallback). Thin wrapper over DrinkRail.
export function SimilarDrinks({ slug }: { slug: string }) {
  return (
    <DrinkRail
      title="More like this"
      endpoint={`/api/recommendations/similar?slug=${encodeURIComponent(slug)}`}
    />
  );
}
