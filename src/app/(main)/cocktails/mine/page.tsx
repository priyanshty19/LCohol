import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CatalogTabs } from "@/components/catalog/catalog-tabs";
import { EntryCard } from "@/components/catalog/entry-card";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentUser } from "@/lib/auth";
import { toCatalogCocktail, type CocktailSelectRow } from "@/lib/catalog";
import { getMyCocktails, getRecentCheersForCreator } from "@/lib/cocktails";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Bar",
  description: "Your personal collection of Sip Stories Mix Lab creations.",
};

export default async function MyDrinksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Both counts are real reads — the stat tiles never show an invented number
  // (see PRODUCT.md: honest by default).
  const [cocktails, partiesHosted, recentCheers] = await Promise.all([
    getMyCocktails(user.id, 100),
    prisma.partyPlan.count({ where: { authorId: user.id } }),
    getRecentCheersForCreator(user.id),
  ]);

  // "Top shelf" is simply your most recent pours, surfaced as a rail so the
  // page opens on something to look at rather than a wall of grid cards.
  const topShelf = cocktails.slice(0, 8);
  const hasRail = cocktails.length > 4;

  return (
    <div className="space-y-8">
      <CatalogTabs active="/cocktails/mine" />

      <header className="space-y-1.5">
        <p className="eyebrow">Personal collection</p>
        <h1 className="screen-title text-foreground">My Bar</h1>
        <p className="text-sm text-muted-foreground">
          Your digital cabinet of curiosities — everything you&apos;ve poured in
          the Mix Lab.
        </p>
      </header>

      {cocktails.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-tile">
            <span className="stat-number">{cocktails.length}</span>
            <span className="text-xs font-medium leading-tight text-muted-foreground">
              Mix{cocktails.length === 1 ? "" : "es"}
              <br />
              created
            </span>
          </div>
          <div className="stat-tile">
            <span className="stat-number">{partiesHosted}</span>
            <span className="text-xs font-medium leading-tight text-muted-foreground">
              Part{partiesHosted === 1 ? "y" : "ies"}
              <br />
              hosted
            </span>
          </div>
        </div>
      )}

      {hasRail && (
        <section className="space-y-3">
          <h2 className="section-title">Top shelf</h2>
          {/* Negative margin lets the rail bleed to the screen edge on mobile,
              so the last card is visibly clipped and the row reads scrollable. */}
          <div className="rail -mx-4 px-4">
            {topShelf.map((cocktail: CocktailSelectRow) => (
              <div key={cocktail.id} className="rail-item w-40 sm:w-44">
                <EntryCard entry={toCatalogCocktail(cocktail)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {cocktails.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="section-title">Recent Cheers</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              The latest love your shared mixes received.
            </p>
          </div>
          {recentCheers.length > 0 ? (
            <div className="rail -mx-4 px-4">
              {recentCheers.map((event) => {
                const profile = event.user.profile;
                const actor = profile?.displayName ?? profile?.username ?? "Someone";
                return (
                  <div key={event.cocktail.id} className="rail-item w-40 space-y-1.5 sm:w-44">
                    <EntryCard
                      entry={toCatalogCocktail(event.cocktail)}
                      badge={`♥ ${event.cocktail._count.cheers}`}
                    />
                    <p className="truncate px-1 text-[11px] text-muted-foreground">
                      Cheered by {actor}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-panel-subtle rounded-xl px-4 py-3 text-sm text-muted-foreground">
              Share a mix with your circle. Their cheers will appear here.
            </div>
          )}
        </section>
      )}

      {cocktails.length ? (
        <section className="space-y-3">
          <h2 className="section-title">
            {hasRail ? "Every mix you've saved" : "Saved mixes"}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {cocktails.map((cocktail: CocktailSelectRow) => (
              <EntryCard key={cocktail.id} entry={toCatalogCocktail(cocktail)} />
            ))}
          </div>
        </section>
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
