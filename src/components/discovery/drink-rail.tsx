"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

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
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    fetch(endpoint)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active) return;
        setRecs(Array.isArray(d?.drinks) ? d.drinks : []);
        setLoaded(true);
      })
      .catch(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, [endpoint]);

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
                <Image
                  src={r.imageUrl}
                  alt={r.name}
                  fill
                  sizes="128px"
                  className="object-cover transition group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-2xl">🥃</div>
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
