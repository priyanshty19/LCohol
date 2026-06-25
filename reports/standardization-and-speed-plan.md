# SIPSTORIES — P0 DB Re-model + P3 Page-Speed Plan

Status of the four asks:
- **P2 (James full-app nav + placement)** — ✅ DONE (NAV_TARGETS extended; floating agentic widget bottom-right on every screen except feed; top-of-feed unchanged).
- **P1 (Google Places nearby bars)** — ✅ SCAFFOLDED (`/api/bars/nearby` + "Near me" button); activates when `GOOGLE_MAPS_API_KEY` is added to env.
- **P0 (full DB re-model)** — designed below; **needs approval before any prod-DB change** (shared prod DB, live data).
- **P3 (page-transition speed)** — analysis + plan below.

---

## P0 — Database re-model

### Verdict first
It is **already one standardized database**: a single Supabase Postgres, accessed only through Prisma, ~40 models, **all UUID primary keys**, consistent `snake_case` `@map`, soft-delete on posts/comments. There is no "multiple DB" problem to fix. What "standardize / root from a main table" really means here is **consolidating the catalog around a single root entity** and closing the duplication/linkage gaps. So this is a *consolidation re-model*, not a new database.

### The real standardization gaps (from the schema audit)
1. **Two beverage worlds, no shared root.** `Drink` (bottled product, FK taxonomy `DrinkCategory`/`DrinkSubcategory`) and `CocktailCreation` (recipe; `category` is **free-text**, not an FK) are unrelated tables with no common parent. `src/lib/james/search.ts` already fakes a union (`CatalogItem {kind}`), and this session added `CatalogEntry` + `EntryCard` at the app layer — but the *database* has no root.
2. **`CocktailCreation` is triple-overloaded** (user creations + editorial corpus + 10k synthetic) distinguished only by `isCurated` + author. The model name lies about its role.
3. **`Drink` vs `Ingredient` duplicate the same real-world thing** (a spirit exists as both a `Drink` row and an `Ingredient` row), linked only opportunistically via `CocktailIngredient.drinkId`.
4. **`Bar` is an island** — not connected to the catalog graph. "Bestsellers" is a `String[]`, not relations to `Drink`/`CocktailCreation`. A bar can't structurally say "we serve this cocktail."
5. **Category vocabulary is split** — `DrinkCategory` (FK) vs cocktail `category` (free text) vs the `categorySlug` this session added. No single category table.

### Target model — root-centered
Introduce one root + one taxonomy, specialize the rest:

```
Category (root taxonomy: spirits, mixed, beer, wine, theme tags) ── self-parent for sub-cats
Beverage (ROOT entity)  { id, kind: DRINK|COCKTAIL, name, slug @unique, categoryId →Category,
                          imageUrl, isCurated, isPublic, authorId? }
   ├─ DrinkProfile      (1:1 when kind=DRINK)   { brand, abv, priceRange, basePriceInr, country, tasteProfile… }
   └─ Recipe            (1:1 when kind=COCKTAIL) { instructions, glass, garnish, sourceBarId }
BeverageIngredient   { beverageId →Beverage(recipe), ingredientId? →Beverage(kind=DRINK) | freeText, qty, unit, sortOrder }
Venue (was Bar)      { …, served: VenueBeverage[] }
VenueBeverage        { venueId →Venue, beverageId →Beverage }   ← bars now link to the catalog
```
Everything user-facing (posts, parties, reviews, mixlab saves, suggestions) FKs to **`Beverage`** instead of separate `Drink`/`CocktailCreation`. Ingredients collapse INTO `Beverage` (a spirit is a `Beverage kind=DRINK`); non-product ingredients (syrup, mixer) become lightweight `Beverage` rows or stay a small `Ingredient` table referenced by `BeverageIngredient`. One `Category` table replaces the split vocabulary.

### Why NOT do this destructively on prod
The target requires renaming/merging `Drink`+`CocktailCreation`→`Beverage`, repointing **every** FK (`PostDrink`, `PartyPlanDrink`, `PartyDrinkSuggestion`, `DrinkReview`, `CocktailIngredient`, `Profile.favoriteDrinkId`, `UserInteraction`), and migrating 10k+ rows. On a **shared prod DB with live users**, a drop-and-recreate would lose data and break the live app + teammates — and the prod `db push` data-loss gate (correctly) blocks it.

### Safe staged migration (additive → backfill → cutover → retire)
Each stage is independently shippable and reversible until the final retire.

1. **Add, don't replace.** `db push` the new tables (`Category`, `Beverage`, `DrinkProfile`, `Recipe`, `BeverageIngredient`, `VenueBeverage`) alongside the existing ones. Purely additive → no data-loss gate.
2. **Backfill** (scripts, like `prisma/backfill-cocktail-slugs.ts`): create one `Beverage` per existing `Drink` and per `CocktailCreation`, populate `DrinkProfile`/`Recipe`, map categories into `Category`, link `BeverageIngredient`, link bars→`VenueBeverage`. Keep a `legacyDrinkId`/`legacyCocktailId` column on `Beverage` for a reversible mapping.
3. **Dual-write** new mutations (creates/saves) to both old + new for a window, so nothing drifts.
4. **Switch reads** module-by-module to `Beverage` (catalog loader `src/lib/catalog.ts` is the natural seam — it already returns `CatalogEntry`; repoint it at `Beverage`). Verify each module in the browser before moving on.
5. **Repoint FKs** via additive nullable `beverageId` columns on the referencing tables + backfill + switch app code, before dropping the old `drinkId`/`cocktailId`.
6. **Retire** old tables/columns only after everything reads from `Beverage` and a soak period — a deliberate, separate, announced step (coordinated with the team since the DB is shared).

### Effort / risk
**XL, multi-day, highest-risk item in the app.** Recommend doing it as its own focused track (not bundled with feature work), on a **branch with a DB copy/staging** if at all possible, and **announced to the team** because the DB is shared. I will not run any destructive stage without explicit go-ahead.

---

## P3 — Page-transition speed

### How to actually measure (do this first — don't optimize blind)
Add real instrumentation so we track per-route load instead of guessing:
- **`web-vitals`** (LCP/INP/CLS) reported from a small client component in `(main)/layout.tsx` → log to console or an endpoint.
- **Server timing**: wrap each page's data fetch in `performance.now()` and emit a `Server-Timing` header (visible in DevTools → Network → Timing).
- **`next build`** already prints per-route First Load JS — watch the heavy ones (mix = three.js, bars = leaflet).

### Per-route first-paint analysis (code-grounded)
| Route | Loads before first paint | Main blocker | Fix (no info hidden) |
|---|---|---|---|
| `/` (feed) | `getPostsFeed` **hot = 500-row** window with full includes, ranked in JS, SSR | The 500-row include is the heaviest query in the app | Fetch lean candidates (id+score+`_count`), rank, hydrate only top 20 with full include; `<Suspense>` the feed list so the shell + AskJames paint instantly |
| `/drinks` | `getDrinks` 24 rows + category/subcategory/tasteProfile/`_count` | Relation-heavy page-1 | Already SSR'd; stream below-the-fold; trim `tasteProfile` from the card query (only needed on detail) |
| `/cocktails` | `getCocktails` 30 curated + ingredients[] each | Nested ingredient relation per row | `<Suspense>` the grid; the `IngredientSearch` already lazy |
| `/cocktails/[slug]`, `/drinks/[id]` | single row + relations | fine | keep |
| `/bars` | bars list + **leaflet** map chunk | Leaflet JS is a big client chunk loaded on mount | already `next/dynamic` lazy; defer map until in-view; show list first |
| `/mix` | editorial strip + **three.js** chunk | three.js bundle | already lazy + pre-warmed this session |
| `/parties`, `/circle`, `/profile/[username]` | per-user lists, `force-dynamic` | sequential awaits (`getCurrentUser` → query) | parallelize independent awaits; lean selects |
| `/search` | 3 ILIKE scans | unindexed substring + (now) `Promise.all` | the `pg_trgm` GIN script (this session) indexes these |

### Cross-cutting optimizations (biggest wins, no information removed)
1. **Split the page-wide `loading.tsx` files into in-layout `<Suspense>` boundaries.** Today each route's `loading.tsx` blanks the *whole* segment (tabs, filters, header) on navigation. Wrapping only the data region in `<Suspense>` keeps the shell painted and streams the data in — the user sees structure instantly, then content. (Carried over as the deferred Phase-7 item.)
2. **Trim SSR selects to first-glance fields**, hydrate detail on interaction. The feed's 500-row hot window is the single biggest target.
3. **Prefetch on intent**: `<Link prefetch>` is on by default in Next; add `router.prefetch` on nav-hover for the heavy routes (bars/mix) so their chunks arrive before the click.
4. **Parallelize per-page waterfalls** (`getCurrentUser` + `getConnectionUserIds` are dependent and can't, but independent fetches can).
5. **Keep the heavy client chunks lazy** (leaflet, three.js — already done) and pre-warm on the preceding screen.

### Recommended order
Measure (instrument) → feed hot-window fix (biggest) → Suspense-granularity refactor (most felt) → trim selects → prefetch heavy routes. None of these remove first-glance information; they stream the shell first and defer only below-the-fold/detail data.
