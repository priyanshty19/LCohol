import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ShareCocktailButton } from "@/components/cocktails/share-cocktail-button";
import { CocktailImageEditor } from "@/components/cocktails/cocktail-image-editor";
import { CheerButton } from "@/components/cocktails/cheer-button";
import type { CatalogCocktailEntry } from "@/types/database";

// Server-rendered cocktail detail (SSR, no client fetch) — the deep-linkable
// counterpart to /drinks/[slug]. The modal in cocktails-view becomes secondary.

export function CocktailDetail({
  entry,
  canEditImage = false,
  canCheer = false,
  initialCheered = false,
}: {
  entry: CatalogCocktailEntry;
  canEditImage?: boolean;
  canCheer?: boolean;
  initialCheered?: boolean;
}) {
  const ingredientNames = entry.ingredients.flatMap((i) => {
    const name = i.ingredient?.name ?? i.drink?.name ?? "Unknown";
    // Existing seeded rows used this vague umbrella label. Keep old databases
    // specific on sight while the corrected seed data rolls out.
    return name.toLocaleLowerCase() === "three premium gins"
      ? ["Stranger & Sons Gin", "Hapusa Himalayan Dry Gin", "Greater Than London Dry Gin"]
      : [name];
  });

  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/cocktails"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        ← All cocktails
      </Link>

      {/* Hero */}
      <header className="glass-panel-subtle relative overflow-hidden rounded-2xl p-5">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <CocktailImageEditor
            cocktailId={entry.id}
            name={entry.name}
            glass={entry.glass}
            initialImageUrl={entry.imageUrl}
            canEdit={canEditImage}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight">
              {entry.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              {entry.category && (
                <Badge variant="drink" className="text-[10px] uppercase tracking-wide">
                  {entry.category}
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px]">
                {entry.isCurated ? "Editorial pick" : "Community mix"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap gap-2">
          <CheerButton
            cocktailId={entry.id}
            initialCount={entry.cheerCount}
            initialCheered={initialCheered}
            canCheer={canCheer}
          />
          <ShareCocktailButton
            name={entry.name}
            slug={entry.slug}
            ingredients={ingredientNames}
          />
        </div>
      </header>

      {ingredientNames.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ingredients
          </h2>
          <div className="flex flex-wrap gap-2">
            {ingredientNames.map((name, idx) => (
              <span
                key={idx}
                className="rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-sm"
              >
                {name}
              </span>
            ))}
          </div>
        </section>
      )}

      {entry.instructions && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Method
          </h2>
          <p className="whitespace-pre-line text-sm leading-relaxed">{entry.instructions}</p>
        </section>
      )}

      {entry.garnish && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Garnish
          </h2>
          <p className="text-sm">🍊 {entry.garnish}</p>
        </section>
      )}

      <footer className="grid grid-cols-2 gap-3 border-t border-border/40 pt-4 text-xs">
        <div className="space-y-0.5">
          <div className="uppercase tracking-wide text-muted-foreground/70">Served in</div>
          <div className="text-foreground">{entry.glass ?? "—"}</div>
        </div>
        <div className="space-y-0.5">
          <div className="uppercase tracking-wide text-muted-foreground/70">Spotted at</div>
          <div className="text-foreground">
            {entry.sourceBar ? (
              <Link
                href={`/bars/${entry.sourceBar.slug}`}
                className="underline-offset-2 hover:underline"
              >
                {entry.sourceBar.name}, {entry.sourceBar.city}
              </Link>
            ) : (
              entry.sourceLabel ?? "Unknown"
            )}
          </div>
        </div>
      </footer>
    </article>
  );
}
