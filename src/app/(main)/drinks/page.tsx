import { DrinksView } from "@/components/drinks/drinks-view";
import { getDrinks, getDrinkFilters } from "@/lib/drinks";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Drinks",
};

export default async function DrinksPage() {
  // Fetch the first page of drinks AND the filter options in parallel on the
  // server — kills the old filters→drinks sequential client waterfall.
  const [initialDrinks, initialFilters] = await Promise.all([
    getDrinks({ sort: "name" }),
    getDrinkFilters(),
  ]);

  return <DrinksView initialDrinks={initialDrinks} initialFilters={initialFilters} />;
}
