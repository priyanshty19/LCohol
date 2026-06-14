"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { CocktailRecipe } from "@/lib/cocktail-recipes";

interface RecipeCardProps {
  recipe: CocktailRecipe;
  isExpanded: boolean;
  onToggle: () => void;
  highlight?: "perfect" | "partial";
  matchInfo?: string;
  availableSlugs?: string[];
}

const DIFFICULTY_COLOR = {
  Easy:   "text-[var(--ml-sober)] border-[var(--ml-sober)]/30 bg-[var(--ml-sober)]/10",
  Medium: "text-primary border-primary/30 bg-primary/10",
  Hard:   "text-[var(--ml-sos)] border-[var(--ml-sos)]/30 bg-[var(--ml-sos)]/10",
};

export function RecipeCard({
  recipe,
  isExpanded,
  onToggle,
  highlight,
  matchInfo,
  availableSlugs = [],
}: RecipeCardProps) {
  const available = new Set(availableSlugs);

  return (
    <Card
      variant="glass"
      className={`drink-card-hover cursor-pointer py-0 transition-all duration-200 ${
        isExpanded ? "border-primary/40 glow-primary" : ""
      }`}
      onClick={onToggle}
    >
      {/* Card header */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{recipe.emoji}</span>
            <div>
              <h3 className="font-display font-semibold text-sm leading-tight">{recipe.name}</h3>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                {recipe.glass} · {recipe.prepTime}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${DIFFICULTY_COLOR[recipe.difficulty]}`}
            >
              {recipe.difficulty}
            </Badge>
            {highlight === "perfect" && (
              <span className="text-[10px] text-[var(--ml-sober)] font-medium">✓ Ready</span>
            )}
            {highlight === "partial" && matchInfo && (
              <span className="text-[10px] text-primary">{matchInfo}</span>
            )}
          </div>
        </div>

        <p className="text-[12px] text-muted-foreground leading-relaxed">
          {recipe.tagline}
        </p>

        {/* Expand indicator */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-1 flex-wrap">
            {recipe.vibes.slice(0, 2).map((v) => (
              <Badge key={v} variant="topic" className="text-[10px]">
                {v}
              </Badge>
            ))}
          </div>
          <span className="text-xs text-muted-foreground/50">
            {isExpanded ? "↑ collapse" : "↓ recipe"}
          </span>
        </div>
      </div>

      {/* Expanded recipe */}
      {isExpanded && (
        <div
          className="border-t border-border/20 px-4 pb-4 pt-3 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ingredients */}
          <div className="space-y-2">
            <h4 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Ingredients
            </h4>
            <ul className="space-y-1.5">
              {recipe.ingredients.map((ing, i) => {
                const isAvailable =
                  ing.drinkSlug && available.size > 0
                    ? available.has(ing.drinkSlug)
                    : null;
                return (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span
                      className={`flex items-center gap-1.5 ${
                        isAvailable === false
                          ? "text-muted-foreground/50"
                          : "text-foreground"
                      }`}
                    >
                      {isAvailable === true && (
                        <span className="text-[var(--ml-sober)] text-[10px]">✓</span>
                      )}
                      {isAvailable === false && (
                        <span className="text-[var(--ml-sos)]/60 text-[10px]">✗</span>
                      )}
                      {ing.name}
                      {ing.isOptional && (
                        <span className="text-[10px] text-muted-foreground/50">(optional)</span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                      {ing.amount}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            <h4 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Method
            </h4>
            <ol className="space-y-2">
              {recipe.steps.map((s) => (
                <li key={s.step} className="flex gap-2.5 text-sm">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                    {s.step}
                  </span>
                  <span className="text-muted-foreground leading-relaxed">
                    {s.instruction}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Garnish */}
          <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
            <span className="text-sm">🌿</span>
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Garnish:</span>{" "}
              {recipe.garnish}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
