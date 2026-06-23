import type { Metadata } from "next";
import { CocktailsView } from "@/components/cocktails/cocktails-view";
import { getCocktails } from "@/lib/cocktails";

export const metadata: Metadata = {
  title: "Cocktails",
  description: "Editorial picks from India's best bars.",
};

export default async function CocktailsPage() {
  // Server-fetch the first page (curated only, matching the view's defaults) so
  // the list is in the SSR HTML — no client mount-fetch waterfall.
  const initial = await getCocktails({ take: 30 });
  return <CocktailsView initial={initial} />;
}
