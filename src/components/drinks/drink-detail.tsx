"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Share2, Sparkles, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TasteProfileChart } from "./taste-profile-chart";
import { CategoryIcon } from "./category-icons";
import type { DrinkWithRelations } from "@/types/database";

const PRICE_LABELS: Record<string, string> = {
  BUDGET: "Budget (Under INR 500)",
  MID_RANGE: "Mid Range (INR 500-2000)",
  PREMIUM: "Premium (INR 2000-5000)",
  LUXURY: "Luxury (Above INR 5000)",
};

const PRICE_SHORT: Record<string, string> = {
  BUDGET: "Budget",
  MID_RANGE: "Mid-range",
  PREMIUM: "Premium",
  LUXURY: "Luxury",
};

const OCCASION_LABELS: Record<string, string> = {
  DATE_NIGHT: "Date Night",
  HOUSE_PARTY: "House Party",
  CLUB_NIGHT: "Club Night",
  CASUAL_HANGOUT: "Casual Hangout",
  CELEBRATION: "Celebration",
  SOLO_RELAXATION: "Solo Relaxation",
  BUSINESS_DINNER: "Business Dinner",
  OUTDOOR_BBQ: "Outdoor BBQ",
  FESTIVAL: "Festival",
  WEEKEND_CHILL: "Weekend Chill",
};

const MOOD_LABELS: Record<string, string> = {
  ADVENTUROUS: "Adventurous",
  ROMANTIC: "Romantic",
  RELAXED: "Relaxed",
  ENERGETIC: "Energetic",
  SOPHISTICATED: "Sophisticated",
  NOSTALGIC: "Nostalgic",
  CELEBRATORY: "Celebratory",
  CONTEMPLATIVE: "Contemplative",
};

interface DrinkDetailProps {
  drinkSlug: string;
  initialDrink?: DrinkWithRelations | null;
}

// Editorial label above a section/title (brass overline, like a magazine kicker).
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-brass">
      {children}
    </p>
  );
}

export function DrinkDetail({ drinkSlug, initialDrink }: DrinkDetailProps) {
  // Seeded from the server render; the effect only refetches on slug change so
  // there's no blank-shell → client-fetch waterfall on first paint.
  const [drink, setDrink] = useState<DrinkWithRelations | null>(initialDrink ?? null);
  const [loading, setLoading] = useState(initialDrink == null);
  const seeded = useRef(initialDrink != null);

  useEffect(() => {
    if (seeded.current) {
      seeded.current = false; // use the SSR seed for first paint
      return;
    }
    let alive = true;
    async function load() {
      const res = await fetch(`/api/drinks/${drinkSlug}`);
      if (alive && res.ok) {
        const json = await res.json();
        setDrink(json.data);
      }
      if (alive) setLoading(false);
    }
    load();
    return () => {
      alive = false;
    };
  }, [drinkSlug]);

  function askJames(name: string) {
    window.dispatchEvent(
      new CustomEvent("ask-james", {
        detail: {
          prompt: `Tell me about ${name} — how should I drink it, and what cocktail should I make with it?`,
        },
      }),
    );
  }

  async function share(name: string) {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: `${name} · Sip Stories`, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* user dismissed the share sheet — no-op */
    }
  }

  if (loading) {
    // Content-shaped skeleton that matches the final layout (hero → title → stats).
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="aspect-[4/5] w-full animate-pulse rounded-[28px] bg-muted sm:aspect-[16/10]" />
        <div className="h-9 w-2/3 animate-pulse rounded-lg bg-muted" />
        <div className="h-16 w-full animate-pulse rounded-xl bg-muted" />
        <div className="h-32 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!drink) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="font-display text-lg font-medium">Drink not found</p>
        <Link href="/drinks" className="mt-2 text-sm text-primary hover:underline">
          Browse all drinks
        </Link>
      </div>
    );
  }

  const topScore = drink.communityScores[0] ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back */}
      <Link
        href="/drinks"
        className="inline-flex items-center gap-1.5 rounded-full text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" />
        Drinks
      </Link>

      {/* Cinematic hero */}
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[28px] border border-white/10 bg-muted/20 sm:aspect-[16/10]">
        {drink.imageUrl ? (
          <Image
            src={drink.imageUrl}
            alt={drink.name}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 672px"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted/40 via-transparent to-transparent">
            <CategoryIcon category={drink.category.name} className="h-24 w-24 text-primary/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        {!drink.isUserSubmitted && (
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brass/40 bg-black/55 px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-wider text-brass backdrop-blur-sm">
              <Star className="h-3 w-3 fill-brass" /> Bartender&apos;s Pick
            </span>
          </div>
        )}
      </div>

      {/* Title block */}
      <div className="space-y-1.5">
        <Eyebrow>
          {drink.category.name}
          {drink.subcategory ? ` · ${drink.subcategory.name}` : ""}
        </Eyebrow>
        <h1 className="font-display text-4xl font-bold leading-tight text-foreground">
          {drink.name}
        </h1>
        {drink.brand && <p className="text-muted-foreground">{drink.brand}</p>}
      </div>

      {/* Stat columns — mono values + caps labels */}
      <div className="grid grid-cols-3 divide-x divide-border/40 rounded-2xl border border-white/10 bg-card/40 py-3 text-center">
        <div className="px-2">
          <p className="font-mono text-lg font-semibold text-primary">
            {drink.abv != null ? `${String(drink.abv)}%` : "—"}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Strength</p>
        </div>
        <div className="px-2">
          <p className="truncate font-mono text-lg font-semibold text-foreground">
            {drink.country ?? "—"}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Origin</p>
        </div>
        <div className="px-2">
          <p className="font-mono text-lg font-semibold text-foreground">
            {drink.priceRange ? (PRICE_SHORT[drink.priceRange] ?? "—") : "—"}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Tier</p>
        </div>
      </div>

      {/* Character chips (moods read as the drink's character) */}
      {drink.moods.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {drink.moods.map(({ mood }) => (
            <span
              key={mood}
              className="rounded-full border border-white/10 bg-card/50 px-3 py-1 text-sm text-foreground/85"
            >
              {MOOD_LABELS[mood] ?? mood}
            </span>
          ))}
        </div>
      )}

      {/* James' Perspective — the house tasting note, brass-accented */}
      {drink.description && (
        <Card className="border-brass/25 bg-brass/[0.06]">
          <CardContent className="space-y-2 pt-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brass" />
              <span className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-brass">
                James&apos; Perspective
              </span>
            </div>
            <p className="font-display text-lg italic leading-relaxed text-foreground/90">
              &ldquo;{drink.description}&rdquo;
            </p>
          </CardContent>
        </Card>
      )}

      {drink.tasteProfile && (
        <Card variant="glass">
          <CardContent className="pt-6">
            <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Taste Profile
            </h2>
            <TasteProfileChart profile={drink.tasteProfile} />
          </CardContent>
        </Card>
      )}

      {drink.occasions.length > 0 && (
        <div>
          <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Best For
          </h2>
          <div className="flex flex-wrap gap-2">
            {drink.occasions.map(({ occasion }) => (
              <Badge key={occasion} variant="recommendation">
                {OCCASION_LABELS[occasion] ?? occasion}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {drink.foodPairings.length > 0 && (
        <div>
          <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Food Pairings
          </h2>
          <div className="flex flex-wrap gap-2">
            {drink.foodPairings.map(({ food }) => (
              <Badge key={food} variant="topic">
                {food}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {drink.communityScores.length > 0 && (
        <>
          <Separator className="border-border/30" />
          <div>
            <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Community Scores
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {drink.communityScores.map((score) => (
                <Card key={score.id} variant="glass" className="p-3 text-center">
                  <p className="font-mono text-2xl font-bold text-primary">{String(score.value)}</p>
                  <p className="text-xs text-muted-foreground">
                    {score.scoreType.toLowerCase().replace("_", " ")} score
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">{score.sampleSize} ratings</p>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      <p className="text-center text-xs text-muted-foreground">
        {topScore ? (
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3 fill-primary text-primary" /> {String(topScore.value)} ·{" "}
          </span>
        ) : null}
        {drink._count.reviews} reviews · {drink._count.posts} mentions in stories
      </p>

      {/* Action bar — in-flow (not sticky) so it never pins over short pages or
          collides with the mobile nav / James launcher. */}
      <div className="pt-1">
        <div className="glass-panel-elevated flex items-center gap-2 rounded-full p-1.5 shadow-2xl">
          <Button
            variant="velvet"
            className="h-11 flex-1 rounded-full font-display"
            onClick={() => askJames(drink.name)}
          >
            <Sparkles className="mr-1.5 h-4 w-4" /> Ask James about this
          </Button>
          <Button
            variant="glass"
            size="icon"
            aria-label="Share"
            className="h-11 w-11 rounded-full"
            onClick={() => share(drink.name)}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
