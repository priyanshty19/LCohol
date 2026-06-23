import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "./category-icons";
import { calculateStatePrice, formatPriceINR } from "@/lib/state-pricing";

interface DrinkCardProps {
  drink: {
    id: string;
    name: string;
    slug: string;
    brand?: string | null;
    imageUrl?: string | null;
    abv?: number | string | null;
    priceRange?: string | null;
    basePriceInr?: number | null;
    category: { name: string };
    subcategory?: { name: string } | null;
    _count: { reviews: number; posts: number };
  };
  stateCode?: string;
}

export function DrinkCard({ drink, stateCode = "DL" }: DrinkCardProps) {
  const statePrice =
    drink.basePriceInr != null
      ? calculateStatePrice(drink.basePriceInr, stateCode)
      : null;

  return (
    <Link href={`/drinks/${drink.slug}`}>
      <Card
        variant="glass"
        className="drink-card-hover group flex flex-col overflow-hidden py-0"
      >
        {/* Image area */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/20">
          {drink.imageUrl ? (
            <>
              <Image
                src={drink.imageUrl}
                alt={drink.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </>
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted/40 via-transparent to-transparent">
              <CategoryIcon
                category={drink.category.name}
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
              {drink.subcategory?.name ?? drink.category.name}
            </Badge>
          </div>
          {/* Price tag overlay */}
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
            {drink.name}
          </h3>
          {drink.brand && (
            <p className="mt-0.5 text-xs text-muted-foreground/70">
              {drink.brand}
            </p>
          )}

          <div className="mt-auto flex items-center justify-between pt-3">
            <div className="flex gap-1.5">
              {drink.abv && (
                <Badge variant="drink" className="px-1.5 font-mono text-[10px]">
                  {String(drink.abv)}%
                </Badge>
              )}
            </div>
            {(drink._count.reviews > 0 || drink._count.posts > 0) && (
              <span className="text-[10px] text-muted-foreground/60">
                {drink._count.posts > 0
                  ? `${drink._count.posts} posts`
                  : `${drink._count.reviews} reviews`}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
