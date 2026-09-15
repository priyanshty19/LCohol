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
      {/* Shared rail: snap scrolling with the scrollbar hidden, bled to the
          screen edge so the last card is visibly clipped and the row reads as
          scrollable rather than cut off. */}
      <div className="rail -mx-4 px-4">
        {cocktails.map((c) => (
          <div key={c.id} className="rail-item w-56">
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
