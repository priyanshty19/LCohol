"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EntryCard } from "@/components/catalog/entry-card";
import { Skeleton } from "@/components/ui/skeleton";
import { CircleLoves } from "@/components/cocktails/circle-loves";
import { MixGame } from "@/components/mix/mix-game";
import { toCatalogCocktail, type CocktailSelectRow } from "@/lib/catalog";

type EditorialPick = {
  id: string;
  name: string;
  slug: string | null;
  category: string | null;
  sourceBar: { name: string; city: string } | null;
  sourceLabel: string | null;
};

export function MixLabView() {
  const [editorialPicks, setEditorialPicks] = useState<EditorialPick[]>([]);
  const [myMixes, setMyMixes] = useState<CocktailSelectRow[]>([]);
  const [loadingPicks, setLoadingPicks] = useState(true);

  useEffect(() => {
    fetch("/api/cocktails?take=12")
      .then((r) => r.json())
      .then((d) => setEditorialPicks(d?.data?.cocktails ?? []))
      .catch(() => {})
      .finally(() => setLoadingPicks(false));
    fetch("/api/cocktails/mine")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMyMixes(d?.data?.cocktails ?? []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🧪</span>
          <h1 className="font-display text-2xl font-semibold text-primary">Mix Lab</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Pick a glass, pour your ingredients, mix, and garnish — your bar, in 3D.
        </p>
      </div>

      <MixGame />

      {loadingPicks && editorialPicks.length === 0 && (
        <div className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-56 shrink-0 rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {editorialPicks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              🍸 Editorial picks from India&apos;s bars
            </h2>
            <Link href="/cocktails" className="text-xs text-primary underline-offset-2 hover:underline">
              Browse all →
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {editorialPicks.map((p) => (
              <Link key={p.id} href={p.slug ? `/cocktails/${p.slug}` : "/cocktails"} className="w-56 shrink-0">
                <Card variant="glass" className="h-full space-y-1.5 p-3 transition hover:border-primary/40">
                  <p className="font-display text-sm font-semibold leading-tight">{p.name}</p>
                  {p.category && <p className="text-[11px] text-muted-foreground">{p.category}</p>}
                  <p className="truncate text-[10px] text-muted-foreground/80">
                    📍 {p.sourceBar ? `${p.sourceBar.name}, ${p.sourceBar.city}` : p.sourceLabel ?? "—"}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      <CircleLoves title="🫂 From your circle's lab" />

      {myMixes.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">🥂 My Mixes</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {myMixes.map((c) => (
              <EntryCard key={c.id} entry={toCatalogCocktail(c)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
