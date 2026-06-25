"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Chevron } from "@/components/ui/chevron";
import { EntryCard } from "@/components/catalog/entry-card";
import { toCatalogCocktail, type CocktailSelectRow } from "@/lib/catalog";

type BarLite = { id: string; name: string; slug: string; city: string };

// Rows arrive in the cocktailSelect shape (from SSR initial + /api/cocktails) and
// are mapped to the canonical CatalogEntry at render time via toCatalogCocktail.
type Cocktail = CocktailSelectRow;

type ApiResponse = { data: { cocktails: Cocktail[]; nextCursor: string | null } };

export function CocktailsView({
  initial,
}: {
  initial: { cocktails: Cocktail[]; nextCursor: string | null };
}) {
  // Seeded from the server render — no mount fetch (see firstRender guard below).
  const [cocktails, setCocktails] = useState<Cocktail[]>(initial.cocktails);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(initial.nextCursor);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeBarId, setActiveBarId] = useState<string | null>(null);
  const [includeDiscover, setIncludeDiscover] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  // StrictMode-safe mount guard: skip the fetch while filters still match what
  // the server already rendered; only a real change differs from this signature.
  const initialSig = useRef(`${activeCategory}|${activeBarId}|${debouncedQuery}|${includeDiscover}`);

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
        if (!r.ok) throw new Error("Couldn't load cocktails");
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
    const sig = `${activeCategory}|${activeBarId}|${debouncedQuery}|${includeDiscover}`;
    if (sig === initialSig.current) return; // unchanged from server render
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

  const activeFilterCount = (activeCategory ? 1 : 0) + (activeBarId ? 1 : 0);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Cocktails</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Editorial picks from India&apos;s best bars — SIDECAR, O Pedro, Bombay Canteen, TOIT, and more.
          New to cocktails? Search a spirit or mood, or use the <span className="text-foreground">Filters</span> button
          below to browse by style. Tap any card for the full recipe — glass, ingredients, method, and where it&apos;s poured.
        </p>
      </header>

      {/* Search + Discover toggle */}
      <div className="space-y-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a cocktail by name…"
          className="sm:max-w-md"
        />
        <label
          className="group flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          title="Curated = handpicked from India's top bars. Discover = 10,000+ community-submitted recipes."
        >
          <input
            type="checkbox"
            checked={includeDiscover}
            onChange={(e) => setIncludeDiscover(e.target.checked)}
            className="h-4 w-4 accent-foreground"
          />
          <span>Include the Discover pool</span>
          <Badge variant="outline" className="text-[10px]">
            10k+ community
          </Badge>
        </label>
      </div>

      {/* Filters — collapsed by default to keep the page calm */}
      {(categories.length > 0 || bars.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltersOpen((o) => !o)}
              className="gap-2"
              aria-expanded={filtersOpen}
              aria-controls="cocktail-filters"
            >
              Filters
              {activeFilterCount > 0 && (
                <Badge className="px-1.5 text-[10px]">{activeFilterCount}</Badge>
              )}
              <Chevron size={14} className={filtersOpen ? "rotate-180" : ""} />
            </Button>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActiveCategory(null);
                  setActiveBarId(null);
                }}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          {filtersOpen && (
            <div id="cocktail-filters" className="space-y-4 rounded-lg border border-border/40 bg-muted/20 p-4">
              {categories.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Browse by style
                  </h3>
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
                </div>
              )}

              {bars.length > 0 && (
                <div className="space-y-2 border-t border-border/40 pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    From a bar
                  </h3>
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
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {loading && cocktails.length === 0 && (
        <div className="text-sm text-muted-foreground">Pouring the list…</div>
      )}
      {!loading && cocktails.length === 0 && (
        <div className="space-y-1 rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">No cocktails matched</p>
          <p>
            {query ? `Nothing for “${query}”. ` : ""}
            Try a different name or style
            {!includeDiscover ? ", or switch on the Discover pool for 10,000+ more." : "."}
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cocktails.map((c) => (
          <EntryCard key={c.id} entry={toCatalogCocktail(c)} />
        ))}
      </div>

      {nextCursor && (
        <div className="flex justify-center">
          <Button onClick={() => fetchPage(false)} variant="outline" disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
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
      aria-pressed={active}
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
