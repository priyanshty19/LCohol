"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { COCKTAIL_RECIPES, findMatchingRecipes } from "@/lib/cocktail-recipes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RecipeCard } from "./recipe-card";

type EditorialPick = {
  id: string;
  name: string;
  category: string | null;
  glass: string | null;
  sourceBar: { name: string; city: string } | null;
  sourceLabel: string | null;
};

// All spirit/drink options the user can pick from
const BOTTLE_OPTIONS = [
  { slug: "old-monk",              name: "Old Monk Rum",          emoji: "🍹", category: "Rum" },
  { slug: "bacardi-white",         name: "Bacardi White",         emoji: "🍹", category: "Rum" },
  { slug: "captain-morgan-spiced", name: "Captain Morgan",        emoji: "🍹", category: "Rum" },
  { slug: "havana-club-3",         name: "Havana Club 3yr",       emoji: "🍹", category: "Rum" },
  { slug: "greater-than-gin",      name: "Greater Than",          emoji: "🫒", category: "Gin" },
  { slug: "stranger-and-sons",     name: "Stranger & Sons",       emoji: "🫒", category: "Gin" },
  { slug: "hapusa-gin",            name: "Hapusa Gin",            emoji: "🫒", category: "Gin" },
  { slug: "bombay-sapphire",       name: "Bombay Sapphire",       emoji: "🫒", category: "Gin" },
  { slug: "magic-moments",         name: "Magic Moments Vodka",   emoji: "🧊", category: "Vodka" },
  { slug: "smirnoff-21",           name: "Smirnoff No. 21",       emoji: "🧊", category: "Vodka" },
  { slug: "absolut-vodka",         name: "Absolut",               emoji: "🧊", category: "Vodka" },
  { slug: "grey-goose",            name: "Grey Goose",            emoji: "🧊", category: "Vodka" },
  { slug: "blenders-pride",        name: "Blenders Pride",        emoji: "🥃", category: "Whisky" },
  { slug: "amrut-fusion",          name: "Amrut Fusion",          emoji: "🥃", category: "Whisky" },
  { slug: "paul-john-brilliance",  name: "Paul John Brilliance",  emoji: "🥃", category: "Whisky" },
  { slug: "johnnie-walker-black",  name: "JW Black Label",        emoji: "🥃", category: "Whisky" },
  { slug: "jose-cuervo-silver",    name: "Jose Cuervo Silver",    emoji: "🌵", category: "Tequila" },
  { slug: "patron-silver",         name: "Patron Silver",         emoji: "🌵", category: "Tequila" },
  { slug: "sula-shiraz",           name: "Sula Shiraz",           emoji: "🍷", category: "Wine" },
  { slug: "sula-sauvignon-blanc",  name: "Sula Sauvignon Blanc",  emoji: "🍷", category: "Wine" },
  { slug: "bira-91-white",         name: "Bira 91 White",         emoji: "🍺", category: "Beer" },
  { slug: "kingfisher-premium",    name: "Kingfisher Premium",    emoji: "🍺", category: "Beer" },
];

const CATEGORIES = ["All", "Rum", "Gin", "Vodka", "Whisky", "Tequila", "Wine", "Beer"];

// Spirit-pref id (onboarding) → Mix Lab category label.
const PREF_TO_CATEGORY: Record<string, string> = {
  whisky: "Whisky",
  rum: "Rum",
  vodka: "Vodka",
  gin: "Gin",
  beer: "Beer",
  wine: "Wine",
  tequila: "Tequila",
};

export function MixLabView() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [activeRecipe, setActiveRecipe] = useState<string | null>(null);
  const [luckyRecipe, setLuckyRecipe] = useState<string | null>(null);
  const [seededFromPrefs, setSeededFromPrefs] = useState(false);
  const [editorialPicks, setEditorialPicks] = useState<EditorialPick[]>([]);
  // True once the user touches a bottle — the prefs seed must not run after that.
  const touchedRef = useRef(false);

  // Editorial picks from curated DB — surfaces the new corpus alongside Mix Lab.
  useEffect(() => {
    fetch("/api/cocktails?take=12")
      .then((r) => r.json())
      .then((d) => setEditorialPicks(d?.data?.cocktails ?? []))
      .catch(() => {});
  }, []);

  // Pre-fill the cabinet from the user's onboarding spirit prefs — one
  // representative bottle per liked category — so recipes show immediately.
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        // Bail if unmounted or the user already started picking — keeps the
        // "pre-filled" label honest (only shown when the seed truly applied).
        if (!alive || touchedRef.current) return;
        const prefs: string[] = d?.user?.preferredSpirits ?? [];
        if (!prefs.length) return;
        const cats = new Set(
          prefs.map((p) => PREF_TO_CATEGORY[p]).filter(Boolean)
        );
        const seed = new Set<string>();
        cats.forEach((cat) => {
          const first = BOTTLE_OPTIONS.find((b) => b.category === cat);
          if (first) seed.add(first.slug);
        });
        if (!seed.size) return;
        setSelected(seed);
        setSeededFromPrefs(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  function toggleBottle(slug: string) {
    touchedRef.current = true;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
    setLuckyRecipe(null);
  }

  const filteredBottles = categoryFilter === "All"
    ? BOTTLE_OPTIONS
    : BOTTLE_OPTIONS.filter((b) => b.category === categoryFilter);

  const matches = useMemo(
    () => findMatchingRecipes(Array.from(selected)),
    [selected]
  );

  const perfectMatches = matches.filter((m) => m.matched === m.total);
  const partialMatches = matches.filter((m) => m.matched < m.total);

  function handleLucky() {
    const all = COCKTAIL_RECIPES;
    const random = all[Math.floor(Math.random() * all.length)];
    setLuckyRecipe(random.id);
    setActiveRecipe(random.id);
  }

  const displayRecipe = activeRecipe
    ? COCKTAIL_RECIPES.find((r) => r.id === activeRecipe) ?? null
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🧪</span>
          <h1 className="font-display text-2xl font-semibold text-primary">
            Mix Lab
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Tell us what&apos;s in your cabinet — we&apos;ll tell you what to make
        </p>
      </div>

      {/* Editorial picks strip — curated from India's best bars */}
      {editorialPicks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              🍸 Editorial picks from India&apos;s bars
            </h2>
            <Link
              href="/cocktails"
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              Browse all →
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {editorialPicks.map((p) => (
              <Link
                key={p.id}
                href="/cocktails"
                className="shrink-0 w-56"
              >
                <Card variant="glass" className="h-full p-3 space-y-1.5 transition hover:border-primary/40">
                  <p className="font-display font-semibold text-sm leading-tight">{p.name}</p>
                  {p.category && (
                    <p className="text-[11px] text-muted-foreground">{p.category}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/80 truncate">
                    📍 {p.sourceBar ? `${p.sourceBar.name}, ${p.sourceBar.city}` : p.sourceLabel ?? "—"}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottle Selector */}
      <div className="glass-panel space-y-4 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            What do you have?
          </h2>
          {selected.size > 0 && (
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`min-h-11 rounded-full px-3 text-xs ${
                categoryFilter === cat ? "pill-active" : "pill-inactive"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Bottle chips */}
        <div className="flex flex-wrap gap-2">
          {filteredBottles.map((bottle) => {
            const isSelected = selected.has(bottle.slug);
            return (
              <button
                key={bottle.slug}
                onClick={() => toggleBottle(bottle.slug)}
                className={`flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs ${
                  isSelected ? "pill-active" : "pill-inactive"
                }`}
              >
                <span>{bottle.emoji}</span>
                {bottle.name}
                {isSelected && <span className="ml-0.5">✓</span>}
              </button>
            );
          })}
        </div>

        {selected.size > 0 && (
          <p className="text-xs text-muted-foreground">
            {selected.size} bottle{selected.size !== 1 ? "s" : ""} selected
            {seededFromPrefs && (
              <span className="text-[var(--ml-velvet-hover)]">
                {" "}· pre-filled from your taste profile 🍸
              </span>
            )}
          </p>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-3">
        <Button
          variant="glass"
          size="lg"
          onClick={handleLucky}
          className="gap-2"
        >
          <span>🎲</span> Feeling Lucky
        </Button>
        {selected.size > 0 && (
          <span className="text-xs text-muted-foreground">
            Found {matches.length} recipe{matches.length !== 1 ? "s" : ""} with your bottles
          </span>
        )}
      </div>

      {/* Results or Browse All */}
      {selected.size === 0 && !luckyRecipe ? (
        /* Browse all recipes */
        <div className="space-y-4">
          <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            All Recipes ({COCKTAIL_RECIPES.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {COCKTAIL_RECIPES.map((recipe) => (
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
      ) : (
        <div className="space-y-6">
          {/* Perfect matches */}
          {perfectMatches.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="font-display font-semibold">✅ You can make these right now</h2>
                <Badge variant="recommendation">
                  {perfectMatches.length}
                </Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {perfectMatches.map(({ recipe }) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    isExpanded={activeRecipe === recipe.id}
                    onToggle={() =>
                      setActiveRecipe(activeRecipe === recipe.id ? null : recipe.id)
                    }
                    highlight="perfect"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Partial matches */}
          {partialMatches.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display font-semibold text-muted-foreground">
                🛒 Missing a few things
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {partialMatches.map(({ recipe, matched, total }) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    isExpanded={activeRecipe === recipe.id}
                    onToggle={() =>
                      setActiveRecipe(activeRecipe === recipe.id ? null : recipe.id)
                    }
                    highlight="partial"
                    matchInfo={`${matched}/${total} spirits`}
                    availableSlugs={Array.from(selected)}
                  />
                ))}
              </div>
            </div>
          )}

          {matches.length === 0 && (
            <div className="glass-panel-subtle flex flex-col items-center justify-center rounded-xl border-dashed py-16 text-center">
              <span className="text-4xl">🤔</span>
              <p className="mt-3 font-medium">No recipes match those bottles yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adding more spirits or check out all recipes below
              </p>
              <Button
                variant="glass"
                size="sm"
                className="mt-4"
                onClick={() => setSelected(new Set())}
              >
                Browse All Recipes
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
