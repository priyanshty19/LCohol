import type { Metadata } from "next";
import { CocktailsView } from "@/components/cocktails/cocktails-view";
import { IngredientSearch } from "@/components/cocktails/ingredient-search";
import { CatalogTabs } from "@/components/catalog/catalog-tabs";
import { getCocktailsCached } from "@/lib/cocktails";

export const metadata: Metadata = {
  title: "Cocktails",
  description: "Editorial picks from India's best bars.",
};

export default async function CocktailsPage() {
  // Server-fetch the first page (curated only, matching the view's defaults) so
  // the list is in the SSR HTML — no client mount-fetch waterfall.
  const initial = await getCocktailsCached({ take: 30 });
  return (
    <div className="space-y-8">
      <CatalogTabs active="/cocktails" />
      <IngredientSearch />
      <CocktailsView initial={initial} />
    </div>
  );
}
