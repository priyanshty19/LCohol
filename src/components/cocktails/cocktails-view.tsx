"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type IngredientLite = { name: string; slug: string; category?: string };
type DrinkLite = { name: string; slug: string };
type BarLite = { id: string; name: string; slug: string; city: string };

type Cocktail = {
  id: string;
  name: string;
  category: string | null;
  glass: string | null;
  garnish: string | null;
  instructions: string | null;
  sourceLabel: string | null;
  isCurated: boolean;
  sourceBar: BarLite | null;
  ingredients: { sortOrder: number; ingredient: IngredientLite | null; drink: DrinkLite | null }[];
};

type ApiResponse = { data: { cocktails: Cocktail[]; nextCursor: string | null } };

export function CocktailsView() {
  const [cocktails, setCocktails] = useState<Cocktail[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeBarId, setActiveBarId] = useState<string | null>(null);
  const [includeDiscover, setIncludeDiscover] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [openCocktail, setOpenCocktail] = useState<Cocktail | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const fetchPage = useCallback(
    async (reset: boolean) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeCategory) params.set("category", activeCategory);
      if (activeBarId) params.set("barId", activeBarId);
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (includeDiscover) params.set("include", "discover");
      params.set("take", "30");
      if (!reset && nextCursor) params.set("cursor", nextCursor);
      try {
        const r = await fetch(`/api/cocktails?${params.toString()}`);
        const json = (await r.json()) as ApiResponse;
        const list = json.data?.cocktails ?? [];
        setCocktails((prev) => (reset ? list : [...prev, ...list]));
        setNextCursor(json.data?.nextCursor ?? null);
      } catch {
        if (reset) setCocktails([]);
      } finally {
        setLoading(false);
      }
    },
    [activeCategory, activeBarId, debouncedQuery, includeDiscover, nextCursor],
  );

  useEffect(() => {
    fetchPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, activeBarId, debouncedQuery, includeDiscover]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const c of cocktails) if (c.category) set.add(c.category);
    return Array.from(set).sort();
  }, [cocktails]);

  const bars = useMemo(() => {
    const map = new Map<string, BarLite>();
    for (const c of cocktails) if (c.sourceBar) map.set(c.sourceBar.id, c.sourceBar);
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [cocktails]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Cocktails</h1>
        <p className="text-sm text-muted-foreground">
          Editorial picks from India&apos;s best bars — SIDECAR, O Pedro, Bombay Canteen, TOIT, and more.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a cocktail by name…"
          className="sm:max-w-xs"
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={includeDiscover}
            onChange={(e) => setIncludeDiscover(e.target.checked)}
            className="h-4 w-4 accent-foreground"
          />
          Include the Discover pool
        </label>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <CategoryChip active={activeCategory === null} onClick={() => setActiveCategory(null)}>
            All
          </CategoryChip>
          {categories.map((c) => (
            <CategoryChip key={c} active={activeCategory === c} onClick={() => setActiveCategory(c)}>
              {c}
            </CategoryChip>
          ))}
        </div>
      )}

      {bars.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <CategoryChip active={activeBarId === null} onClick={() => setActiveBarId(null)}>
            Any bar
          </CategoryChip>
          {bars.map((b) => (
            <CategoryChip key={b.id} active={activeBarId === b.id} onClick={() => setActiveBarId(b.id)}>
              {b.name}
            </CategoryChip>
          ))}
        </div>
      )}

      {loading && cocktails.length === 0 && (
        <div className="text-sm text-muted-foreground">Loading cocktails…</div>
      )}
      {!loading && cocktails.length === 0 && (
        <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
          Nothing matched. Try clearing filters or enabling the Discover pool.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cocktails.map((c) => (
          <button
            key={c.id}
            onClick={() => setOpenCocktail(c)}
            className="text-left"
            type="button"
          >
            <Card className="h-full transition hover:border-foreground/30 hover:shadow-md">
              <CardHeader className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{c.name}</CardTitle>
                  {!c.isCurated && (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      Discover
                    </Badge>
                  )}
                </div>
                {c.category && (
                  <div className="text-xs text-muted-foreground">{c.category}</div>
                )}
              </CardHeader>
              <CardContent className="space-y-1.5 text-xs text-muted-foreground">
                {c.glass && <div>🥃 {c.glass}</div>}
                {c.sourceBar && (
                  <div>📍 {c.sourceBar.name}, {c.sourceBar.city}</div>
                )}
                {!c.sourceBar && c.sourceLabel && (
                  <div className="line-clamp-1">📍 {c.sourceLabel}</div>
                )}
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {nextCursor && (
        <div className="flex justify-center">
          <Button onClick={() => fetchPage(false)} variant="outline" disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}

      {mounted &&
        createPortal(
          <AnimatePresence>
            {openCocktail && (
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpenCocktail(null)}
                className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
              >
                <motion.div
                  key="card"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-border/60 bg-popover text-popover-foreground shadow-2xl ring-1 ring-black/5 sm:rounded-2xl"
                >
                  <div className="shrink-0 border-b border-border/50 px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold">{openCocktail.name}</h2>
                        {openCocktail.category && (
                          <div className="text-xs text-muted-foreground">{openCocktail.category}</div>
                        )}
                      </div>
                      <button
                        onClick={() => setOpenCocktail(null)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        aria-label="Close"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                    {openCocktail.ingredients.length > 0 && (
                      <section>
                        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Ingredients
                        </h3>
                        <ul className="space-y-1 text-sm">
                          {openCocktail.ingredients.map((i, idx) => (
                            <li key={idx}>
                              • {i.ingredient?.name ?? i.drink?.name ?? "Unknown"}
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}
                    {openCocktail.instructions && (
                      <section>
                        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Method
                        </h3>
                        <p className="whitespace-pre-line text-sm leading-relaxed">
                          {openCocktail.instructions}
                        </p>
                      </section>
                    )}
                    {openCocktail.garnish && (
                      <section>
                        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Garnish
                        </h3>
                        <p className="text-sm">{openCocktail.garnish}</p>
                      </section>
                    )}
                    {openCocktail.glass && (
                      <div className="text-xs text-muted-foreground">Served in: {openCocktail.glass}</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Spotted at:{" "}
                      {openCocktail.sourceBar ? (
                        <Link
                          href={`/bars/${openCocktail.sourceBar.slug}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {openCocktail.sourceBar.name}, {openCocktail.sourceBar.city}
                        </Link>
                      ) : (
                        openCocktail.sourceLabel ?? "Unknown"
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1 text-xs transition " +
        (active
          ? "border-foreground bg-foreground text-background"
          : "border-border/60 bg-muted/30 text-muted-foreground hover:border-foreground/30 hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}
