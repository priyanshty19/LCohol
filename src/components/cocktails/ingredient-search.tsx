"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EntryCard } from "@/components/catalog/entry-card";
import { JamesAvatar } from "@/components/james/james-avatar";
import { toCatalogCocktail, type CocktailSelectRow } from "@/lib/catalog";
import { phrasesFor } from "@/lib/james/loading-phrases";

type IngredientOption = { name: string; slug: string; category: string };
type MatchRow = CocktailSelectRow & { matched: number };
type MatchResponse = { data: { cocktails: MatchRow[]; selectedCount: number } };

// "Make something with what you have" — add ingredients, get live cocktail
// matches ranked by overlap (deterministic). Plus an optional hand-off to James
// for a creative riff. This is the hybrid search from the plan.
export function IngredientSearch() {
  const [options, setOptions] = useState<IngredientOption[]>([]);
  const [selected, setSelected] = useState<Map<string, string>>(new Map()); // slug -> name
  const [query, setQuery] = useState("");
  const [includeDiscover, setIncludeDiscover] = useState(false);
  const [results, setResults] = useState<MatchRow[]>([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  // Inline James riff — his reply renders right here in the card (not the
  // floating panel), which is what the search should feel like.
  const [jamesAsk, setJamesAsk] = useState<string | null>(null);
  const [jamesReply, setJamesReply] = useState<string | null>(null);
  const [jamesLoading, setJamesLoading] = useState(false);
  const phraseRef = useRef(phrasesFor("cocktails")[0]);

  // Load the ingredient dictionary once.
  useEffect(() => {
    fetch("/api/ingredients")
      .then((r) => r.json())
      .then((d) => setOptions(d.data?.ingredients ?? []))
      .catch(() => {});
  }, []);

  // Live, debounced match fetch whenever the selection (or Discover) changes.
  useEffect(() => {
    const slugs = [...selected.keys()];
    if (!slugs.length) {
      setResults([]);
      setSelectedCount(0);
      return;
    }
    setLoading(true);
    phraseRef.current = phrasesFor("cocktails")[Math.floor(Date.now() / 1000) % 3];
    const t = setTimeout(() => {
      const params = new URLSearchParams({ slugs: slugs.join(","), take: "24" });
      if (includeDiscover) params.set("include", "discover");
      fetch(`/api/cocktails/by-ingredients?${params.toString()}`)
        .then((r) => r.json())
        .then((d: MatchResponse) => {
          setResults(d.data?.cocktails ?? []);
          setSelectedCount(d.data?.selectedCount ?? slugs.length);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [selected, includeDiscover]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return options
      .filter((o) => !selected.has(o.slug) && o.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, options, selected]);

  function addIngredient(o: IngredientOption) {
    setSelected((prev) => new Map(prev).set(o.slug, o.name));
    setQuery("");
  }
  function removeIngredient(slug: string) {
    setSelected((prev) => {
      const n = new Map(prev);
      n.delete(slug);
      return n;
    });
  }

  function askJames() {
    const names = [...selected.values()];
    if (!names.length) return;
    // No em-dash in James-voiced copy (persona rule).
    const list =
      names.length === 1
        ? names[0]
        : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    askJamesFor(list);
  }

  // Free-text hand-off: type anything (even something not in the ingredient
  // dictionary, like "mango lassi vibes") and James riffs on it — his reply
  // renders inline below, right here in the search.
  async function askJamesFor(what: string) {
    const q = what.trim();
    if (!q || jamesLoading) return;
    setQuery("");
    setJamesAsk(q);
    setJamesReply(null);
    setJamesLoading(true);
    try {
      const r = await fetch("/api/james/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "user", content: `I've got ${q}. What cocktail should I make?` },
          ],
        }),
      });
      if (!r.ok) throw new Error("agent failed");
      const data = (await r.json()) as { reply?: string };
      setJamesReply(data.reply || "Hmm, nothing came to mind. Try another ingredient?");
    } catch {
      setJamesReply("James stepped away from the bar. Give it another go.");
    } finally {
      setJamesLoading(false);
    }
  }

  const hasSelection = selected.size > 0;

  return (
    <Card className="overflow-visible border-primary/20">
      <CardContent className="space-y-4 pt-5">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-semibold">Make something with what you have</h2>
          <p className="text-xs text-muted-foreground">
            Add a few ingredients and I&apos;ll show you what you can pour.
          </p>
        </div>

        {/* Selected ingredient pills */}
        {hasSelection && (
          <div className="flex flex-wrap gap-1.5">
            {[...selected.entries()].map(([slug, name]) => (
              <button
                key={slug}
                type="button"
                onClick={() => removeIngredient(slug)}
                className="group inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs text-foreground transition hover:border-destructive/50"
                title="Remove"
              >
                {name}
                <span className="text-muted-foreground group-hover:text-destructive">✕</span>
              </button>
            ))}
          </div>
        )}

        {/* Ingredient input + suggestions */}
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) {
                e.preventDefault();
                // First dictionary match if any, else hand the raw text to James.
                if (suggestions.length) addIngredient(suggestions[0]);
                else askJamesFor(query);
              }
            }}
            placeholder="Add an ingredient — gin, lime, mango…"
            className="sm:max-w-md"
          />
          {query.trim() && (
            <div className="absolute z-20 mt-1 w-full max-w-md overflow-hidden rounded-lg border border-border/60 bg-popover shadow-xl">
              {suggestions.map((o) => (
                <button
                  key={o.slug}
                  type="button"
                  onClick={() => addIngredient(o)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50"
                >
                  <span>{o.name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
                    {o.category.toLowerCase()}
                  </span>
                </button>
              ))}
              {/* Always offer James on the raw text — so a word that isn't in the
                  ingredient dictionary still goes somewhere useful. */}
              <button
                type="button"
                onClick={() => askJamesFor(query)}
                className="flex w-full items-center gap-2 border-t border-border/50 bg-primary/5 px-3 py-2 text-left text-sm text-primary hover:bg-primary/10"
              >
                🍸 Ask James about “{query.trim()}”
              </button>
            </div>
          )}
        </div>

        {/* Inline James riff — his reply lands right here, not the floating panel. */}
        {(jamesLoading || jamesReply) && (
          <div className="flex gap-3 rounded-xl border border-[var(--ml-velvet-bright)]/25 bg-[var(--ml-velvet-bright)]/5 p-3">
            <JamesAvatar className="h-9 w-9 shrink-0 rounded-full ring-1 ring-[var(--ml-velvet-bright)]/30" />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[var(--ml-velvet-bright)]">
                  James{jamesAsk ? ` · on “${jamesAsk}”` : ""}
                </span>
                {jamesReply && (
                  <button
                    type="button"
                    onClick={() => { setJamesReply(null); setJamesAsk(null); }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                )}
              </div>
              {jamesLoading ? (
                <p className="text-sm text-muted-foreground">{phraseRef.current}</p>
              ) : (
                <p className="whitespace-pre-line text-sm leading-relaxed">{jamesReply}</p>
              )}
            </div>
          </div>
        )}

        {hasSelection && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  checked={includeDiscover}
                  onChange={(e) => setIncludeDiscover(e.target.checked)}
                  className="h-3.5 w-3.5 accent-foreground"
                />
                Include the Discover pool
              </label>
              <Button variant="outline" size="sm" onClick={askJames} className="ml-auto">
                🍸 Ask James to riff
              </Button>
            </div>

            {loading && results.length === 0 ? (
              <p className="text-sm text-muted-foreground">{phraseRef.current}</p>
            ) : results.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                Nothing matches those yet. Try fewer or more common ingredients
                {!includeDiscover ? ", or switch on the Discover pool." : "."}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((c) => (
                  <EntryCard
                    key={c.id}
                    entry={toCatalogCocktail(c)}
                    badge={selectedCount > 0 ? `${c.matched}/${selectedCount}` : null}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
