import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CategoryIcon } from "@/components/drinks/category-icons";
import type { CatalogCocktailEntry } from "@/types/database";

// Server-rendered cocktail detail (SSR, no client fetch) — the deep-linkable
// counterpart to /drinks/[slug]. The modal in cocktails-view becomes secondary.

export function CocktailDetail({ entry }: { entry: CatalogCocktailEntry }) {
  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-3">
        <Link
          href="/cocktails"
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          ← All cocktails
        </Link>
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted/30">
            <CategoryIcon category={entry.glass} className="h-9 w-9 text-primary/55" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{entry.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {entry.category && (
                <Badge variant="drink" className="text-[10px] uppercase tracking-wide">
                  {entry.category}
                </Badge>
              )}
              {!entry.isCurated && (
                <Badge variant="outline" className="text-[10px]">
                  Discover
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      {entry.ingredients.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ingredients
          </h2>
          <ul className="space-y-1 text-sm">
            {entry.ingredients.map((i, idx) => (
              <li key={idx}>• {i.ingredient?.name ?? i.drink?.name ?? "Unknown"}</li>
            ))}
          </ul>
        </section>
      )}

      {entry.instructions && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Method
          </h2>
          <p className="whitespace-pre-line text-sm leading-relaxed">{entry.instructions}</p>
        </section>
      )}

      {entry.garnish && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Garnish
          </h2>
          <p className="text-sm">{entry.garnish}</p>
        </section>
      )}

      <footer className="space-y-1 border-t border-border/40 pt-4 text-xs text-muted-foreground">
        {entry.glass && <div>Served in: {entry.glass}</div>}
        <div>
          Spotted at:{" "}
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
      </footer>
    </article>
  );
}
