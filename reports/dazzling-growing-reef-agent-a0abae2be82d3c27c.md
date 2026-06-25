# Cocktails search + James suggestion mechanism — map for live ingredient→cocktail suggestion

## Cocktails today
- Page: `src/app/(main)/cocktails/page.tsx` SSR-fetches first page via `getCocktails({ take: 30 })`, passes to `CocktailsView`.
- View: `src/components/cocktails/cocktails-view.tsx` — client. Search is **name-only** (`q` → `name contains`), 300ms debounce, category/bar filters derived from loaded rows, Discover-pool toggle, cursor pagination, modal recipe card. No ingredient input.
- API: `src/app/api/cocktails/route.ts` GET → `getCocktails`. Revalidate 300.
- Query: `src/lib/cocktails.ts` `getCocktails` — `where` builds on `isPublic`, `isCurated`, `category`, `sourceBarId`, `name contains q`. Selects ingredients (ingredient/drink). **No ingredient-based WHERE.**

## James mechanism (to mirror)
- `src/lib/james/search.ts` `searchCatalog(query)` — tokenizes query (stopwords stripped, 3+ char words), OR-matches across cocktail name/category/description + drink name/brand/description. Returns `{results, similar}` (similar = top hit's category). Pure data, no auth, no LLM. `catalogDigest()` makes a text summary.
- `src/app/api/james/agent/route.ts` — non-streaming JSON `{reply, actions, cards}`. Uses **%%ACTION%% directive protocol** (not native tool calls): LLM appends one machine line `%%ACTION%% {json}`, parsed+stripped by `parseReply`. `find_drinks` directive → calls `searchCatalog`. Has a keyword-regex fallback to surface cards even when no directive emitted.
- `src/components/james/ask-james.tsx` — feed composer. POSTs whole history, runs actions client-side, renders `cards.results`/`cards.similar` via `ResultRow`/`ResultCard`. **This is the closest UI template for ingredient→cocktail cards.**
- `src/components/james/james-widget.tsx` — floating widget, **streaming** (`/api/james/chat`, reads `res.body` chunks). Listens for the **`ask-james` CustomEvent** (`window.addEventListener("ask-james")`) to open + send a prefilled prompt. MEMORY warns: don't delete this launcher-less widget.

## Schema for ingredient matching
- `CocktailIngredient` joins `CocktailCreation` ↔ `Ingredient` (named, `IngredientCategory` enum) and/or `Drink`. `Ingredient.name` unique, has `slug`.
- So a cocktail's ingredients are queryable via `cocktailCreation.findMany({ where: { ingredients: { some: { ingredient: { name/slug in [...] } } } } })`.

## Recommendation for the new feature
Build a parallel `searchByIngredients(slugs/names)` in `src/lib/cocktails.ts` (mirror `searchCatalog`'s pure-data shape) that counts ingredient overlap and ranks by match count. Add a chips/tag ingredient input to `CocktailsView` (reuse `CategoryChip`), debounce, call a new `/api/cocktails/by-ingredients` route, render results live. Mirror James's debounce-then-fetch + card-row rendering rather than the LLM/%%ACTION%% protocol — the suggestion is deterministic, no model needed.
