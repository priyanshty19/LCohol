"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { VIBES } from "@/lib/vibe-config";
import { COCKTAIL_RECIPES } from "@/lib/cocktail-recipes";

export function HomeSidebar() {
  const [trendingDrinks, setTrendingDrinks] = useState<any[]>([]);
  const [randomRecipe] = useState(
    () => COCKTAIL_RECIPES[Math.floor(Math.random() * COCKTAIL_RECIPES.length)]
  );

  useEffect(() => {
    fetch("/api/drinks?sort=popular&limit=5")
      .then((r) => r.json())
      .then((d) => setTrendingDrinks(d.data?.slice(0, 5) ?? []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-5 sticky top-20">
      {/* Tonight's Random Pick */}
      <Card className="border-border/20 bg-card/30 p-4 space-y-3 backdrop-blur">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          🎲 Tonight's Random Pick
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{randomRecipe.emoji}</span>
          <div>
            <p className="font-semibold text-sm">{randomRecipe.name}</p>
            <p className="text-[11px] text-muted-foreground">{randomRecipe.tagline}</p>
          </div>
        </div>
        <Link
          href="/mix"
          className="block w-full rounded-lg border border-primary/30 bg-primary/10 py-1.5 text-center text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          Get the Recipe →
        </Link>
      </Card>

      {/* Vibe Quick Jump */}
      <Card className="border-border/20 bg-card/30 p-4 space-y-3 backdrop-blur">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          🌙 What's your vibe?
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {VIBES.slice(0, 4).map((vibe) => (
            <Link
              key={vibe.id}
              href={`/vibe`}
              className="flex items-center gap-1.5 rounded-lg border border-border/20 bg-card/40 px-2.5 py-2 text-xs hover:border-border/50 hover:bg-card/60 transition-colors"
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
          Pick tonight's vibe →
        </Link>
      </Card>

      {/* Trending Drinks */}
      {trendingDrinks.length > 0 && (
        <Card className="border-border/20 bg-card/30 p-4 space-y-3 backdrop-blur">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            🔥 Trending Drinks
          </h3>
          <ul className="space-y-2.5">
            {trendingDrinks.map((drink, i) => (
              <li key={drink.id}>
                <Link
                  href={`/drinks/${drink.slug}`}
                  className="flex items-center gap-2.5 group"
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
        <Card className="border-red-500/20 bg-red-500/5 p-4 space-y-1.5 cursor-pointer hover:border-red-500/40 hover:bg-red-500/10 transition-all">
          <div className="flex items-center gap-2">
            <span className="text-xl">🆘</span>
            <p className="font-semibold text-sm text-red-400">Hangover SOS</p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Recovery protocols, the math on when you're sober, and India-specific remedies
          </p>
        </Card>
      </Link>
    </div>
  );
}
