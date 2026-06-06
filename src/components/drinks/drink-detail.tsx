"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TasteProfileChart } from "./taste-profile-chart";
import type { DrinkWithRelations } from "@/types/database";

const PRICE_LABELS: Record<string, string> = {
  BUDGET: "Budget (Under INR 500)",
  MID_RANGE: "Mid Range (INR 500-2000)",
  PREMIUM: "Premium (INR 2000-5000)",
  LUXURY: "Luxury (Above INR 5000)",
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
}

export function DrinkDetail({ drinkSlug }: DrinkDetailProps) {
  const [drink, setDrink] = useState<DrinkWithRelations | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/drinks/${drinkSlug}`);
      if (res.ok) {
        const json = await res.json();
        setDrink(json.data);
      }
      setLoading(false);
    }
    load();
  }, [drinkSlug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="h-64 animate-pulse rounded-lg bg-card/50" />
      </div>
    );
  }

  if (!drink) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="text-lg font-medium">Drink not found</p>
        <Link href="/drinks" className="mt-2 text-sm text-primary hover:underline">
          Browse all drinks
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/drinks" className="hover:text-primary">
            Drinks
          </Link>
          {" / "}
          {drink.category.name}
          {drink.subcategory && ` / ${drink.subcategory.name}`}
        </p>
        <h1 className="mt-2 text-2xl font-bold">{drink.name}</h1>
        {drink.brand && (
          <p className="text-muted-foreground">{drink.brand}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {drink.abv && (
          <Badge variant="outline">{String(drink.abv)}% ABV</Badge>
        )}
        {drink.priceRange && (
          <Badge variant="secondary">
            {PRICE_LABELS[drink.priceRange] ?? drink.priceRange}
          </Badge>
        )}
        {drink.country && (
          <Badge variant="outline">{drink.country}</Badge>
        )}
      </div>

      {drink.description && (
        <p className="text-sm leading-relaxed text-foreground/90">
          {drink.description}
        </p>
      )}

      {drink.tasteProfile && (
        <Card className="border-border/30 bg-card/50">
          <CardContent className="pt-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Taste Profile
            </h2>
            <TasteProfileChart profile={drink.tasteProfile} />
          </CardContent>
        </Card>
      )}

      {drink.occasions.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Best For
          </h2>
          <div className="flex flex-wrap gap-2">
            {drink.occasions.map(({ occasion }) => (
              <Badge key={occasion} variant="secondary">
                {OCCASION_LABELS[occasion] ?? occasion}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {drink.moods.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Mood
          </h2>
          <div className="flex flex-wrap gap-2">
            {drink.moods.map(({ mood }) => (
              <Badge key={mood} variant="outline">
                {MOOD_LABELS[mood] ?? mood}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {drink.foodPairings.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Food Pairings
          </h2>
          <div className="flex flex-wrap gap-2">
            {drink.foodPairings.map(({ food }) => (
              <Badge key={food} variant="outline">
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
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Community Scores
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {drink.communityScores.map((score) => (
                <Card
                  key={score.id}
                  className="border-border/30 bg-card/50 p-3 text-center"
                >
                  <p className="text-2xl font-bold text-primary">
                    {String(score.value)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {score.scoreType.toLowerCase().replace("_", " ")} score
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">
                    {score.sampleSize} ratings
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator className="border-border/30" />

      <div className="text-center text-xs text-muted-foreground">
        <p>{drink._count.reviews} reviews / {drink._count.posts} mentions in stories</p>
      </div>
    </div>
  );
}
