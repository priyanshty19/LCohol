"use client";

import { useEffect, useState } from "react";
import { EntryCard } from "@/components/catalog/entry-card";
import { toCatalogCocktail, type CocktailSelectRow } from "@/lib/catalog";

type CircleCocktail = CocktailSelectRow & {
  author?: { profile: { username: string } | null } | null;
};

/**
 * "Loved by your circle" — mixes invented by the viewer's connections, best
 * scored first. Renders nothing while loading, logged out, or with an empty
 * circle, so it never leaves a hole on the page. Used on the Cocktails tab
 * and in Mix Lab.
 */
export function CircleLoves({ title = "🫂 Loved by your circle" }: { title?: string }) {
  const [cocktails, setCocktails] = useState<CircleCocktail[]>([]);

  useEffect(() => {
    fetch("/api/cocktails/circle")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCocktails(d?.data?.cocktails ?? []))
      .catch(() => {});
  }, []);

  if (!cocktails.length) return null;

  return (
    <div className="space-y-3">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {cocktails.map((c) => (
          <div key={c.id} className="w-56 shrink-0">
            <EntryCard entry={toCatalogCocktail(c)} />
            {c.author?.profile?.username && (
              <p className="mt-1 truncate text-[10px] text-muted-foreground/80">
                mixed by {c.author.profile.username}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
