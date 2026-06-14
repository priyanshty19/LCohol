"use client";

import { useState, useMemo } from "react";
import { COCKTAIL_RECIPES, findMatchingRecipes } from "@/lib/cocktail-recipes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RecipeCard } from "./recipe-card";

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

export function MixLabView() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [activeRecipe, setActiveRecipe] = useState<string | null>(null);
  const [luckyRecipe, setLuckyRecipe] = useState<string | null>(null);

  function toggleBottle(slug: string) {
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
          <h1 className="text-2xl font-bold" style={{ fontFamily: "EB Garamond, serif" }}>
            Mix Lab
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Tell us what's in your cabinet — we'll tell you what to make
        </p>
      </div>

      {/* Bottle Selector */}
      <div className="space-y-4 rounded-xl border border-border/20 bg-card/30 p-5 backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
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
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-card/60 text-muted-foreground hover:text-foreground border border-border/30"
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
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  isSelected
                    ? "border-primary bg-primary/15 text-primary shadow-sm shadow-primary/10"
                    : "border-border/30 bg-card/40 text-muted-foreground hover:border-border/60 hover:text-foreground"
                }`}
              >
                <span>{bottle.emoji}</span>
                {bottle.name}
                {isSelected && <span className="ml-0.5 text-primary">✓</span>}
              </button>
            );
          })}
        </div>

        {selected.size > 0 && (
          <p className="text-xs text-muted-foreground">
            {selected.size} bottle{selected.size !== 1 ? "s" : ""} selected
          </p>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={handleLucky}
          className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
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
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
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
                <h2 className="font-semibold">✅ You can make these right now</h2>
                <Badge className="bg-green-500/20 text-green-400 text-xs border-green-500/30">
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
              <h2 className="font-semibold text-muted-foreground">
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
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/30 py-16 text-center">
              <span className="text-4xl">🤔</span>
              <p className="mt-3 font-medium">No recipes match those bottles yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adding more spirits or check out all recipes below
              </p>
              <Button
                variant="outline"
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
