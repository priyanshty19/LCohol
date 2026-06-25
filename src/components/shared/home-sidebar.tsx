"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VIBES } from "@/lib/vibe-config";
import { COCKTAIL_RECIPES } from "@/lib/cocktail-recipes";

type ApiPick = {
  name: string;
  category: string | null;
  sourceBar: { name: string; city: string } | null;
} | null;

export function HomeSidebar() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [trendingDrinks, setTrendingDrinks] = useState<any[]>([]);
  // Start with a deterministic static recipe so server and first client render
  // match. We then upgrade to a curated DB pick if /api/cocktails/random
  // responds; falls back to a random static recipe if the API is unreachable.
  const [randomRecipe, setRandomRecipe] = useState(COCKTAIL_RECIPES[0]);
  const [apiPick, setApiPick] = useState<ApiPick>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRandomRecipe(
      COCKTAIL_RECIPES[Math.floor(Math.random() * COCKTAIL_RECIPES.length)]
    );
    fetch("/api/cocktails/random")
      .then((r) => r.json())
      .then((d) => {
        const c = d?.data?.cocktail;
        if (c?.name) setApiPick({ name: c.name, category: c.category, sourceBar: c.sourceBar });
      })
      .catch(() => {});
    fetch("/api/drinks?sort=popular&take=5")
      .then((r) => r.json())
      .then((d) => setTrendingDrinks(d.data?.slice(0, 5) ?? []))
      .catch(() => {});
  }, []);

  const displayName = apiPick?.name ?? randomRecipe.name;
  const displayTagline = apiPick
    ? apiPick.sourceBar
      ? `${apiPick.sourceBar.name}, ${apiPick.sourceBar.city}`
      : apiPick.category ?? "Editorial pick"
    : randomRecipe.tagline;
  const displayEmoji = apiPick ? "🍸" : randomRecipe.emoji;
  const recipeHref = apiPick ? "/cocktails" : "/mix";

  return (
    <div className="space-y-5 sticky top-20">
      {/* Tonight's Random Pick */}
      <Card variant="glass" className="p-4 space-y-3">
        <h3 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          🎲 Tonight&apos;s Random Pick
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{displayEmoji}</span>
          <div className="min-w-0">
            <p className="font-display font-semibold text-sm truncate">{displayName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{displayTagline}</p>
          </div>
        </div>
        <Button
          variant="gold"
          size="sm"
          className="w-full"
          nativeButton={false}
          render={<Link href={recipeHref} />}
        >
          Get the Recipe →
        </Button>
      </Card>

      {/* Vibe Quick Jump */}
      <Card variant="glass" className="p-4 space-y-3">
        <h3 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          🌙 What&apos;s your vibe?
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {VIBES.slice(0, 4).map((vibe) => (
            <Link
              key={vibe.id}
              href={`/vibe`}
              className="glass-panel-subtle flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs transition-colors hover:border-primary/30 hover:text-primary"
            >
              <span>{vibe.emoji}</span>
              <span className="text-muted-foreground">{vibe.label}</span>
            </Link>
          ))}
        </div>
        <Link
          href="/vibe"
          className="block text-center text-xs text-primary underline-offset-2 hover:underline"
        >
          Pick tonight&apos;s vibe →
        </Link>
      </Card>

      {/* Trending Drinks */}
      {trendingDrinks.length > 0 && (
        <Card variant="glass" className="p-4 space-y-3">
          <h3 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            🔥 Trending Drinks
          </h3>
          <ul className="space-y-2.5">
            {trendingDrinks.map((drink, i) => (
              <li key={drink.id}>
                <Link
                  href={`/drinks/${drink.slug}`}
                  className="drink-card-hover -mx-2 flex min-h-11 items-center gap-2.5 rounded-lg px-2 group"
                >
                  <span className="text-xs text-muted-foreground/40 w-4 font-mono">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {drink.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60 truncate">
                      {drink.category?.name}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground/40">→</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/drinks"
            className="block text-center text-xs text-primary underline-offset-2 hover:underline"
          >
            Explore all drinks →
          </Link>
        </Card>
      )}

      {/* Hangover SOS CTA */}
      <Link href="/hangover">
        <Card
          variant="glass"
          className="p-4 space-y-1.5 cursor-pointer border-[var(--ml-sos)]/20 transition-all hover:border-[var(--ml-sos)]/40 hover:glow-danger"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🆘</span>
            <p className="font-display font-semibold text-sm text-[var(--ml-sos)]">Hangover SOS</p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Recovery protocols, the math on when you&apos;re sober, and India-specific remedies
          </p>
        </Card>
      </Link>
    </div>
  );
}
