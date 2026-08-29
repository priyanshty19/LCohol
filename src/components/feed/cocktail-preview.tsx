import Link from "next/link";

// A shared mix/cocktail post carries a "/cocktails/<slug>" link in its body
// (from the Mix Lab / cocktail-page share). Instead of leaving that as a bare
// text link, surface a small recipe card so drink shares pop in the feed. Pure
// presentation — the slug is already in the post body, so no extra DB fetch.

// Keep underscore support for links created by the early Mix Lab slugger.
const COCKTAIL_LINK_RE = /\/cocktails\/([a-z0-9][a-z0-9_-]*)/i;

/** Extract the first cocktail slug referenced in a post body, if any. */
export function cocktailSlugFromBody(body: string | null | undefined): string | null {
  if (!body) return null;
  const m = body.match(COCKTAIL_LINK_RE);
  return m ? m[1] : null;
}

export function CocktailPreviewCard({ slug }: { slug: string }) {
  return (
    <Link href={`/cocktails/${slug}`} className="mt-3 block">
      <div className="group/recipe flex items-center gap-3 rounded-xl border border-primary/25 bg-gradient-to-r from-primary/10 to-transparent p-3 transition-colors hover:border-primary/50">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/25 to-primary/5 text-xl ring-1 ring-primary/15">
          🍸
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">
            Recipe
          </p>
          <p className="text-sm font-medium text-foreground">Tap to view &amp; remix this drink</p>
        </div>
        <span className="text-primary/70 transition-transform group-hover/recipe:translate-x-0.5">→</span>
      </div>
    </Link>
  );
}
