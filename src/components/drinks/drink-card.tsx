import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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

const CATEGORY_ICONS: Record<string, string> = {
  Beer: "🍺",
  Wine: "🍷",
  Whiskey: "🥃",
  Rum: "🍹",
  Gin: "🫒",
  Vodka: "🧊",
  Tequila: "🌵",
  Brandy: "🥂",
  Liqueur: "🍸",
};

export function DrinkCard({ drink, stateCode = "DL" }: DrinkCardProps) {
  const icon = CATEGORY_ICONS[drink.category.name] ?? "🥃";
  const statePrice =
    drink.basePriceInr != null
      ? calculateStatePrice(drink.basePriceInr, stateCode)
      : null;

  return (
    <Link href={`/drinks/${drink.slug}`}>
      <Card className="group flex flex-col overflow-hidden border-border/20 bg-card/40 backdrop-blur-sm transition-all duration-200 hover:border-primary/20 hover:bg-card/60 hover:shadow-lg hover:shadow-primary/5">
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
            <div className="flex h-full items-center justify-center">
              <span className="text-5xl opacity-20">{icon}</span>
            </div>
          )}
          {/* Category pill overlay */}
          <div className="absolute left-2 top-2">
            <Badge className="border-none bg-black/50 text-[10px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm">
              {drink.subcategory?.name ?? drink.category.name}
            </Badge>
          </div>
          {/* Price tag overlay */}
          {statePrice != null && (
            <div className="absolute bottom-2 right-2">
              <span className="rounded-md bg-black/60 px-2 py-1 text-sm font-bold text-[#f2bf64] backdrop-blur-sm">
                {formatPriceINR(statePrice)}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-3.5">
          <h3 className="text-sm font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
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
                <Badge
                  variant="outline"
                  className="border-primary/20 bg-primary/5 px-1.5 text-[10px] text-primary"
                >
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
