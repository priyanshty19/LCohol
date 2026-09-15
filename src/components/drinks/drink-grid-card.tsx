import Link from "next/link";
import { FadeImage } from "@/components/ui/fade-image";
import { DefaultDrinkArtwork } from "@/components/drinks/default-drink-artwork";
import { calculateStatePrice, formatPriceINR } from "@/lib/state-pricing";
import type { CatalogDrinkEntry } from "@/types/database";

/**
 * Drinks-database card: bottle art fills the tile and the name / category /
 * brand / ABV sit on a scrim over it, per the stitch "Drinks Database" screen.
 * Deliberately separate from the shared <EntryCard> so the cocktail catalog
 * and My Bar keep their existing card treatment.
 */
export function DrinkGridCard({
  entry,
  stateCode = "DL",
}: {
  entry: CatalogDrinkEntry;
  stateCode?: string;
}) {
  const price =
    entry.basePriceInr != null
      ? formatPriceINR(calculateStatePrice(entry.basePriceInr, stateCode))
      : null;
  const kindLabel = entry.subcategory ?? entry.category ?? "Drink";

  return (
    <Link href={`/drinks/${entry.slug}`} className="group block">
      <article className="media-card aspect-[3/4]">
        <div className="absolute inset-0">
          {entry.imageUrl ? (
            <FadeImage
              src={entry.imageUrl}
              alt=""
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              unoptimized
              fallback={
                <DefaultDrinkArtwork
                  name={entry.name}
                  category={entry.category}
                  kind="drink"
                />
              }
            />
          ) : (
            <DefaultDrinkArtwork
              name={entry.name}
              category={entry.category}
              kind="drink"
              className="transition-transform duration-500 group-hover:scale-[1.06]"
            />
          )}
        </div>

        <div className="media-scrim" aria-hidden />

        {price && (
          <div className="absolute right-2 top-2">
            <span className="overlay-chip">{price}</span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 space-y-0.5 p-3">
          <h3 className="line-clamp-2 text-sm font-bold leading-tight text-white drop-shadow-sm">
            {entry.name}
          </h3>
          <p className="truncate text-xs text-white/75">{kindLabel}</p>
          <div className="flex items-baseline justify-between gap-2 pt-0.5">
            <span className="truncate text-[11px] text-white/60">
              {entry.brand ?? "—"}
            </span>
            {entry.abv != null && (
              <span className="shrink-0 text-[11px] font-semibold text-white/85">
                {entry.abv}% ABV
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
