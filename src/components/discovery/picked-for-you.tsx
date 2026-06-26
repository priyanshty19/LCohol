"use client";

import { DrinkRail } from "./drink-rail";

// Personalized "Picked for you" rail — hybrid recommender output. Thin wrapper over
// the generic DrinkRail.
export function PickedForYou() {
  return <DrinkRail title="Picked for you" endpoint="/api/recommendations" />;
}
