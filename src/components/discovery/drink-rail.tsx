"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FadeImage } from "@/components/ui/fade-image";
import { DefaultDrinkArtwork } from "@/components/drinks/default-drink-artwork";

type Rec = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  brand: string | null;
  category: string | null;
};

// Generic horizontal drink rail. Fetches `{ drinks: Rec[] }` from `endpoint` and
// renders nothing until it has results — so it never shows an empty box.
export function DrinkRail({ title, endpoint }: { title: string; endpoint: string }) {
  const [result, setResult] = useState<{ endpoint: string; recs: Rec[]; loaded: boolean }>({
    endpoint,
    recs: [],
    loaded: false,
  });
  const current = result.endpoint === endpoint
    ? result
    : { endpoint, recs: [] as Rec[], loaded: false };

  useEffect(() => {
    let active = true;
    fetch(endpoint)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active) return;
        setResult({ endpoint, recs: Array.isArray(d?.drinks) ? d.drinks : [], loaded: true });
      })
      .catch(() => {
        if (active) setResult({ endpoint, recs: [], loaded: true });
      });
    return () => {
      active = false;
    };
  }, [endpoint]);

  const { recs, loaded } = current;

  // Collapse only once we KNOW it's empty; while loading we reserve height with a
  // skeleton so the content below doesn't jump (no layout shift / pop-in).
  if (loaded && recs.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {!loaded &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={`sk-${i}`} className="w-32 shrink-0" aria-hidden>
              <div className="aspect-square animate-pulse rounded-xl border border-border/60 bg-muted" />
              <div className="mt-1.5 h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
          ))}
        {loaded &&
          recs.map((r) => (
          <Link key={r.id} href={`/drinks/${r.slug}`} className="group w-32 shrink-0">
            <div className="relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-card">
              {r.imageUrl ? (
                <FadeImage
                  src={r.imageUrl}
                  alt={r.name}
                  fill
                  sizes="128px"
                  className="object-cover transition group-hover:scale-105"
                  fallback={<DefaultDrinkArtwork name={r.name} category={r.category} />}
                />
              ) : (
                <DefaultDrinkArtwork name={r.name} category={r.category} />
              )}
            </div>
            <p className="mt-1.5 truncate text-sm font-medium">{r.name}</p>
            {r.category && <p className="truncate text-xs text-muted-foreground">{r.category}</p>}
          </Link>
        ))}
      </div>
    </section>
  );
}
