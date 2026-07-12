"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { VIBES, BUDGET_RANGES } from "@/lib/vibe-config";
import { calculateStatePrice, formatPriceINR } from "@/lib/state-pricing";
import { useStateSelection } from "@/components/drinks/state-selector";
import { StateSelector } from "@/components/drinks/state-selector";
import { EntryCard } from "@/components/catalog/entry-card";
import { getRecipesByVibe } from "@/lib/cocktail-recipes";
import { toCatalogDrink } from "@/lib/catalog";
import { RecipeCard } from "@/components/mix/recipe-card";
import { Button } from "@/components/ui/button";
import { applyTheme, vibeToTheme } from "@/lib/theme";

export function VibeView() {
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [drinks, setDrinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeRecipe, setActiveRecipe] = useState<string | null>(null);
  const { stateCode, setStateCode, loaded } = useStateSelection();

  const currentVibe = VIBES.find((v) => v.id === selectedVibe);
  const currentBudget = BUDGET_RANGES.find((b) => b.id === selectedBudget);

  useEffect(() => {
    if (!selectedVibe) { setDrinks([]); return; }

    setLoading(true);
    const vibe = VIBES.find((v) => v.id === selectedVibe)!;

    // Fetch drinks by slugs from the vibe config
    const params = new URLSearchParams({ sort: "popular" });
    fetch(`/api/drinks?${params}`)
      .then((r) => r.json())
      .then((data) => {
        let results = (data.data ?? []) as any[];

        // Filter to vibe's preferred drinks
        results = results.filter((d: any) =>
          vibe.drinkSlugs.includes(d.slug)
        );

        // Apply budget filter
        if (currentBudget) {
          results = results.filter((d: any) => {
            if (!d.basePriceInr) return true;
            const price = calculateStatePrice(d.basePriceInr, stateCode);
            const inMin = price >= currentBudget.min;
            const inMax = currentBudget.max == null || price <= currentBudget.max;
            return inMin && inMax;
          });
        }

        // Sort by vibe order preference
        results.sort(
          (a: any, b: any) =>
            vibe.drinkSlugs.indexOf(a.slug) - vibe.drinkSlugs.indexOf(b.slug)
        );

        setDrinks(results);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedVibe, selectedBudget, stateCode, currentBudget]);

  const cocktailSuggestions = selectedVibe
    ? getRecipesByVibe(selectedVibe).slice(0, 3)
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🌙</span>
          <h1 className="font-display text-2xl font-semibold text-primary">
            Tonight's Vibe
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Tell us your mood — we'll tell you what to pour
        </p>
      </div>

      {/* Vibe selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            What's the vibe?
          </h2>
          <button
            type="button"
            onClick={() => {
              setSelectedVibe(null);
              setSelectedBudget(null);
              setActiveRecipe(null);
              // Back to the default Ivory Cream look.
              applyTheme("light", { persist: true });
            }}
            className="pill-inactive shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all hover:text-primary"
          >
            ↺ Reset the Vibe
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {VIBES.map((vibe) => (
            <button
              key={vibe.id}
              onClick={() => {
                const next = selectedVibe === vibe.id ? null : vibe.id;
                setSelectedVibe(next);
                setActiveRecipe(null);
                // Picking a vibe dresses the whole app in it; clearing returns to cream.
                applyTheme(next ? vibeToTheme(next) : "light", { persist: true });
              }}
              className={`drink-card-hover relative min-h-11 overflow-hidden rounded-xl p-4 text-left transition-all duration-200 ${
                selectedVibe === vibe.id
                  ? "glass-panel-elevated border-primary/40 glow-primary"
                  : "glass-panel"
              }`}
            >
              {/* Gradient bg when selected */}
              {selectedVibe === vibe.id && (
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${vibe.gradient} opacity-60`}
                />
              )}
              <div className="relative z-10">
                <span className="text-2xl">{vibe.emoji}</span>
                <p className="mt-1.5 font-display font-semibold text-sm">{vibe.label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {vibe.tagline}
                </p>
              </div>
              {selectedVibe === vibe.id && (
                <div className="absolute top-2 right-2 z-10 text-primary text-xs font-bold">✓</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Budget + State row */}
      {selectedVibe && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-1.5">
            <p className="font-display text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Budget
            </p>
            <div className="flex flex-wrap gap-2">
              {BUDGET_RANGES.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBudget(selectedBudget === b.id ? null : b.id)}
                  className={`min-h-11 rounded-full px-3 text-xs ${
                    selectedBudget === b.id ? "pill-active" : "pill-inactive"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
          {loaded && (
            <div className="ml-auto">
              <StateSelector value={stateCode} onChange={setStateCode} />
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {selectedVibe && (
        <div className="space-y-6">
          {/* Drink suggestions */}
          <div className="space-y-3">
            <h2 className="font-display font-semibold">
              {currentVibe?.emoji} Drinks for {currentVibe?.label}
            </h2>
            {loading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-56 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : drinks.length === 0 ? (
              <div className="glass-panel-subtle rounded-xl border-dashed py-10 text-center">
                <span className="text-3xl">😕</span>
                <p className="mt-2 text-sm text-muted-foreground">
                  No drinks match this vibe + budget combo
                </p>
                <button
                  onClick={() => setSelectedBudget(null)}
                  className="mt-2 text-xs text-primary underline underline-offset-2"
                >
                  Remove budget filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {drinks.map((drink) => (
                  <EntryCard key={drink.id} entry={toCatalogDrink(drink)} stateCode={stateCode} />
                ))}
              </div>
            )}
          </div>

          {/* Cocktail suggestions */}
          {cocktailSuggestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold">🧪 Cocktails for this vibe</h2>
                <Link
                  href="/mix"
                  className="text-xs text-primary underline-offset-2 hover:underline"
                >
                  Mix Lab →
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cocktailSuggestions.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    isExpanded={activeRecipe === recipe.id}
                    onToggle={() =>
                      setActiveRecipe(activeRecipe === recipe.id ? null : recipe.id)
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state — no vibe selected */}
      {!selectedVibe && (
        <div className="glass-panel-subtle rounded-xl border-dashed py-16 text-center">
          <span className="text-5xl">☝️</span>
          <p className="mt-4 text-base font-medium">Pick a vibe to get started</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We'll match you with the perfect drinks and cocktail recipes
          </p>
        </div>
      )}
    </div>
  );
}
