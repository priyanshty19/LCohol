import Link from "next/link";
import { FadeImage } from "@/components/ui/fade-image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/drinks/category-icons";
import { calculateStatePrice, formatPriceINR } from "@/lib/state-pricing";
import type { CatalogEntry } from "@/types/database";

// ONE card for the whole catalog. Replaces DrinkCard's drink-only shape, the
// inline cocktail card in cocktails-view, and (eventually) RecipeCard's summary.
// Branches on entry.kind: drinks link to /drinks/[slug] and show price/abv;
// cocktails link to /cocktails/[slug] and show glass/source + a Discover badge.

interface EntryCardProps {
  entry: CatalogEntry;
  stateCode?: string;
  /** Optional corner label (e.g. ingredient-match strength "3/4"). When set, it
   *  takes the top-right slot in place of the Discover badge. */
  badge?: string | null;
}

export function EntryCard({ entry, stateCode = "DL", badge }: EntryCardProps) {
  const href =
    entry.kind === "drink"
      ? `/drinks/${entry.slug}`
      : entry.slug
        ? `/cocktails/${entry.slug}`
        : "#";

  const pillLabel =
    entry.kind === "drink"
      ? entry.subcategory ?? entry.category ?? "Drink"
      : entry.category ?? "Cocktail";

  const statePrice =
    entry.kind === "drink" && entry.basePriceInr != null
      ? calculateStatePrice(entry.basePriceInr, stateCode)
      : null;

  return (
    <Link href={href}>
      <Card
        variant="glass"
        className="drink-card-hover group flex flex-col overflow-hidden py-0"
      >
        {/* Image / icon area */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/20">
          {entry.imageUrl ? (
            <>
              <FadeImage
                src={entry.imageUrl}
                alt={entry.name}
                fill
                className="object-cover transition-[opacity,transform] duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </>
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted/40 via-transparent to-transparent">
              {/* Drinks resolve to a spirit icon; cocktails fall back to a glass. */}
              <CategoryIcon
                category={entry.kind === "drink" ? entry.category : entry.glass}
                className="h-16 w-16 text-primary/45 transition-transform duration-300 group-hover:scale-110"
              />
            </div>
          )}
          {/* Category pill overlay */}
          <div className="absolute left-2 top-2">
            <Badge
              variant="drink"
              className="font-display text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm"
            >
              {pillLabel}
            </Badge>
          </div>
          {/* Match badge takes precedence; else Discover badge for non-curated cocktails */}
          {badge ? (
            <div className="absolute right-2 top-2">
              <Badge className="bg-primary/85 text-[10px] font-semibold text-primary-foreground backdrop-blur-sm">
                {badge}
              </Badge>
            </div>
          ) : (
            entry.kind === "cocktail" &&
            !entry.isCurated && (
              <div className="absolute right-2 top-2">
                <Badge variant="outline" className="bg-black/50 text-[10px] backdrop-blur-sm">
                  Discover
                </Badge>
              </div>
            )
          )}
          {/* Price tag overlay (drinks only) */}
          {statePrice != null && (
            <div className="absolute bottom-2 right-2">
              <span className="rounded-md bg-black/60 px-2 py-1 font-mono text-sm font-bold text-primary backdrop-blur-sm">
                {formatPriceINR(statePrice)}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-3.5">
          <h3 className="font-display text-sm font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
            {entry.name}
          </h3>
          {entry.subtitle && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground/70">
              {entry.subtitle}
            </p>
          )}

          <div className="mt-auto flex items-center justify-between pt-3">
            <div className="flex gap-1.5">
              {entry.kind === "drink" && entry.abv != null && (
                <Badge variant="drink" className="px-1.5 font-mono text-[10px]">
                  {String(entry.abv)}%
                </Badge>
              )}
              {entry.kind === "cocktail" && entry.glass && (
                <span className="text-[11px] text-muted-foreground/70">🥃 {entry.glass}</span>
              )}
            </div>
            {entry.kind === "drink" &&
              (entry.counts.reviews > 0 || entry.counts.posts > 0) && (
                <span className="text-[10px] text-muted-foreground/60">
                  {entry.counts.posts > 0
                    ? `${entry.counts.posts} posts`
                    : `${entry.counts.reviews} reviews`}
                </span>
              )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
