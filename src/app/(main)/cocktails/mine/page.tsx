import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CatalogTabs } from "@/components/catalog/catalog-tabs";
import { EntryCard } from "@/components/catalog/entry-card";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentUser } from "@/lib/auth";
import { toCatalogCocktail } from "@/lib/catalog";
import { getMyCocktails } from "@/lib/cocktails";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Drinks",
  description: "Your saved Sip Stories Mix Lab creations.",
};

export default async function MyDrinksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const cocktails = await getMyCocktails(user.id, 100);

  return (
    <div className="space-y-8">
      <CatalogTabs active="/cocktails/mine" />

      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          My Drinks
        </h1>
        <p className="text-sm text-muted-foreground">
          Every drink you have saved from the Mix Lab, newest first.
        </p>
      </header>

      {cocktails.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cocktails.map((cocktail) => (
            <EntryCard key={cocktail.id} entry={toCatalogCocktail(cocktail)} />
          ))}
        </div>
      ) : (
        <EmptyState
          emoji="🍸"
          title="Your first signature drink is waiting"
          subtitle="Create a recipe in the Mix Lab and it will appear here automatically."
          actionLabel="Create a drink"
          actionHref="/mix"
        />
      )}
    </div>
  );
}
