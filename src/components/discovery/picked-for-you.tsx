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

// "Picked for you" rail — personalized drink recs from the user's behavior. Fetches
// client-side; renders nothing until it has results, so it never shows an empty box.
export function PickedForYou() {
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/recommendations")
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
  }, []);

  if (!loaded || recs.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Picked for you
      </h2>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {recs.map((r) => (
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
