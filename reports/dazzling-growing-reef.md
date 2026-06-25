# SIPSTORIES — Feature + Performance Plan

## Context

A large feature drop just landed (parties, circle, a 10k-cocktail seed, referrals, notifications, agentic James). It exposed structural debt that now blocks the next round of features: **drinks and cocktails are modelled and rendered three different ways**, and several requested features (live cocktail search, MixLab, party cocktails) all need to read from one consistent catalog. This plan standardizes that foundation first, then builds the five requested features on top, and folds in a performance pass.

The plan is grounded in a full read of the codebase (6-agent map). Every approach below reuses an existing pattern where one exists — we are converging duplicated code, not adding a fourth way to do things.

### Why this is needed (the core finding)
- **Three parallel "cocktail" worlds:** DB `CocktailCreation` (curated + 10k synthetic, distinguished only by `isCurated`), hardcoded `COCKTAIL_RECIPES` (15 recipes, drives MixLab/Vibe), and the CSV pipeline. MixLab also hardcodes `BOTTLE_OPTIONS` (22 spirits) instead of querying `Drink`.
- **Drinks duplicated across tables:** spirits exist as both `Drink` rows *and* `Ingredient` rows, linked only opportunistically via `CocktailIngredient.drinkId`.
- **Three card components:** `DrinkCard`, an inline card inside `cocktails-view.tsx`, and `RecipeCard` — no shared display type.
- **One thing already does it right:** `src/lib/james/search.ts` defines `CatalogItem { kind, id, name, category, subtitle, slug }` and merges both tables. We promote *that* to canonical.

## Locked decisions
| Area | Decision |
|---|---|
| Data model | **Unify** Drink + Cocktail into one model/type + one shared component (max scope: migrate hardcoded recipes/bottles into DB) |
| Build order | **Standardize DB first**, then features |
| Cocktail search | **Hybrid** — deterministic live ingredient match **+** optional "Ask James to riff" handoff |
| MixLab left panel | **Visual mixing vessel** (stacked colored liquid layers) |
| MixLab save | **Save to "My Mixes"** (private `CocktailCreation`) |
| Party games | **Persist + upvote** (new model) |
| Party cocktails | **Either drink or cocktail** (generalize `PartyPlanDrink`) |
| Party contributions | **Any party member** can suggest games/cocktails (revoke stays **host-only**) |
| Execution | Each phase: build → adversarial review → fix → verify in browser before "done" |

---

## Phase 1 — Standardize drinks/cocktails (foundation) · XL

The headline workstream. Everything else depends on it.

**Type + loader**
- Add canonical `CatalogEntry` discriminated union to `src/types/database.ts` (next to `DrinkWithRelations`). Shared core `{ id, kind, name, slug, category, imageUrl, subtitle }`; `kind:'drink'` extends with brand/abv/priceRange/tasteProfile, `kind:'cocktail'` with glass/garnish/instructions/ingredients/sourceBar. Model on the existing `CatalogItem` in `src/lib/james/search.ts`.
- New `src/lib/catalog.ts`: one loader wrapping `getDrinks` (`src/lib/drinks.ts`) + `getCocktails` (`src/lib/cocktails.ts`). Factor the **identical** `take+1 / cursor / skip:1` keyset pattern out of both into one helper. Reuse `cocktailSelect` and the `getDrinks` include as the two projections. **Preserve the `Prisma.Decimal → Number` coercion** (`getDrinks` already does `abv`; also `CommunityScore.value`) or RSC rejects the payload.

**Schema (db push A)** — shared prod DB, use `prisma db push` not `migrate dev`:
- `CocktailCreation.slug String @unique` — cocktails currently have **no slug** and only render in a modal; backfill in `prisma/seed-cocktails.ts` via the existing `slugify()` (ensure uniqueness across the 10k synthetic rows, e.g. suffix collisions).
- `@@index([isCurated, name])` + `@@index([category])` on `CocktailCreation` (also a P1 perf fix — the default sort/filter scans 10k rows unindexed today).
- **Category reconciliation** (the one genuinely hard part): `Cocktail.category` is uncontrolled free-text from the CSV `Source` column ("South Inspired", "The Icons") while `Drink.category` is an FK taxonomy. Recommended pragmatic path: add a `normalizeCocktailCategory()` util that maps the CSV strings to a controlled slug set, store it as `CocktailCreation.categorySlug`, and keep raw `category` as a display label. A full shared `Category` table is a stretch goal, not required for v1.

**Component**
- One `<EntryCard kind=...>` by **extending `DrinkCard`** (`src/components/drinks/drink-card.tsx`) — it already does image/category-icon fallback, badges, counts. Add cocktail affordances (glass, source bar) behind the `kind` branch.
- Retire the inline card in `cocktails-view.tsx`. Keep `RecipeCard` **only** for the MixLab interactive step view.
- Add an SSR cocktail detail route mirroring `/drinks/[id]` (so cocktails deep-link; modal becomes secondary). Note: `DrinkDetail` currently client-fetches on mount — make the cocktail route SSR and ideally migrate drink detail to SSR too for consistency.

**Collapse the parallel sources**
- Migrate hardcoded `COCKTAIL_RECIPES` (`src/lib/cocktail-recipes.ts`) into `CocktailCreation` rows; migrate `BOTTLE_OPTIONS` into a `Drink` query filtered by category. Then MixLab/Vibe read the DB. (Reconcile their loose `drinkSlug` strings to real `Drink.slug` during migration or matching regresses.)

**Consumers to repoint at `catalog.ts` / `EntryCard`:** `cocktails-view.tsx`, `vibe-view.tsx`, `search-view.tsx`, and `james/search.ts` `searchCatalog`. Fix `HomeSidebar` over-fetch here too (see Perf P1).

**Reuse:** `CatalogItem`/`searchCatalog` (`james/search.ts`), `cocktailSelect` (`cocktails.ts`), `getDrinks` include (`drinks.ts`), `slugify`/`classifyIngredient`/`splitIngredients` (`prisma/seed-cocktails.ts`), enum→label dicts (`drink-detail.tsx`).

---

## Phase 2 — Revoke-invitee in Party · S · *independent, run in parallel*

- Extract `requireHost(partyId, userId)` into `src/lib/parties.ts` **first** — host-ownership checks are copy-pasted inline per route today; a missed re-implementation is a security hole.
- Add `DELETE` to `src/app/api/parties/[id]/invites/route.ts` taking `{ inviteId }`. Guard with `requireHost`. Delete the matching `PartyInvite` scoped to `partyPlanId`. For **link invites** (`invitedUserId === null`), also delete/expire the paired `Referral` by `code` in a `$transaction` (they're created together) — else the code stays redeemable.
- `party-detail.tsx`: render a small **Remove** button on each guest row (`~lines 121-138`) when `isHost && status !== CANCELLED`; wire to DELETE; optimistically `setInvites(prev => prev.filter(i => i.id !== id))`. Add `code` to `inviteSelect` to label/revoke link rows. Tolerate temp ids (`tmp-${userId}`) until `router.refresh`.
- Note: revoking a user with an outstanding link invite doesn't fully lock them out (they can re-accept). Acceptable for v1; flag if hard lock-out is wanted.

---

## Phase 3 — Hybrid ingredient-aware cocktail search · M · *depends on Phase 1*

"The way James acts" = live results that refresh as you add ingredients. Hybrid = deterministic match **plus** a James riff handoff.

**Deterministic core**
- Add `searchByIngredients(slugs|names, { includeDiscover, take })` to `src/lib/cocktails.ts`, mirroring `searchCatalog`'s pure-data style: `cocktailCreation.findMany({ where: { isPublic: true, /* curated unless discover */, ingredients: { some: { OR: [{ ingredient: { slug: { in } } }, { drink: { slug: { in } } }] } } }, select: cocktailSelect })`. **Match on both** `ingredient` and `drink` — `CocktailIngredient.ingredientId` is nullable (spirits are stored as `Drink`). Score each row in JS by count of selected ingredients present; sort desc; tie-break `isCurated` then name. No schema change — the join already exists.
- New `src/app/api/cocktails/by-ingredients/route.ts` (keep the `{ data: { cocktails, nextCursor } }` envelope so view state barely changes) and `src/app/api/ingredients/route.ts` sourcing the picker list from the **`Ingredient` table** (not loaded rows — those are incomplete), de-duplicated against the Drink/Ingredient overlap.
- `cocktails-view.tsx`: ingredient chip-input above the grid (reuse the existing `CategoryChip` as removable pills + the existing 300ms debounce-then-fetch). Show **match strength** ("has 3 of 4"). Render with `ResultRow`/`ResultCard` copied from `ask-james.tsx`; reuse `phrasesFor('cocktails')` for the spinner.

**James riff (the hybrid half)**
- Add an "Ask James to riff on these" affordance that dispatches the window `ask-james` CustomEvent with the current ingredient set as `detail.prompt`, routing into `/api/james/agent`'s `find_drinks` directive. Keep deterministic search LLM-free; James is the optional creative layer. **Do not delete `james-widget.tsx`** (bars/help depend on its event). No em-dash in James-voiced copy.

---

## Phase 4 — Party suggest-a-cocktail (either drink or cocktail) · M · *depends on Phase 1*

- **Schema (db push B):** generalize the join. Add nullable `cocktailId` to `PartyPlanDrink` (and make `drinkId` nullable) so a party can attach **either** a `Drink` or a `CocktailCreation` — fits the unified model. Adjust the composite PK accordingly (or move to a surrogate id).
- New `src/app/api/parties/[id]/drinks/route.ts` POST + DELETE, **member-gated** (host or invited — add membership awareness; routes only check host today).
- `getPartyDetail` (`parties.ts`): include the attached drinks/cocktails.
- `party-detail.tsx`: new `<Card>` section between the RSVP/HostControls block and the guest list. Catalog search input modeled on the bar-search debounce in `create-party-flow.tsx`, hitting the catalog search. Render attached items with the **Phase 1 `EntryCard`**.

---

## Phase 5 — Party suggest-a-game (persist + upvote) · M · *independent of catalog*

- **Schema (db push C):** `PartyGameSuggestion { id, partyPlanId, suggestedById, text, createdAt }` + a `PartyGameVote { gameSuggestionId, userId }` join (proper dedup, one vote per member) rather than a raw `votes` counter.
- New `src/app/api/parties/[id]/games/route.ts` (POST suggest + GET) and a vote endpoint; **member-gated**.
- `getPartyDetail` include; `party-detail.tsx` card section mirroring the suggest-a-cocktail pattern, using `RSVP_TONE`/`motion.div` row styling for consistency.

---

## Phase 6 — MixLab redesign: vessel + palette + save · L · *depends on Phase 1, reuses Phase 3*

- **State:** replace order-agnostic `useState<Set<string>>` with an ordered `layers` list via `useReducer` (addLayer/removeLayer/reorder/clear); array order = pour/render order bottom→top. Keep a derived `Set` so `findMatchingRecipes` still works.
- **Layout:** split the single column into `lg:grid-cols-[minmax(0,1fr)_360px]` (stack below `lg`). **LEFT** = new `src/components/mix/mix-vessel.tsx` (SVG glass outline; swap shape by `recipe.glass`: highball/rocks/coupe/wine) with clipped colored bands per layer, animated with `motion/react` on height+opacity (liquid "rises" as layers stack). **RIGHT** = lift the existing category tabs + chip palette unchanged, plus the live `RecipeCard` match list.
- **Colors:** no DB color field exists (verified). Build a client `CATEGORY_COLORS` lookup mapping `IngredientCategory` → liquid color using the `--ml-*` tokens in `globals.css` (SPIRIT→velvet/brass, JUICE→warm, MIXER→pale, ICE→translucent, GARNISH→accent). Layer heights equal-weight or heuristic (ingredient amounts are free-text, not numeric).
- **Palette:** extend beyond the 22 spirits by sourcing mixers/juices/garnish from the `Ingredient` table (`/api/ingredients` from Phase 3).
- **Live suggestion:** reuse `searchByIngredients` (Phase 3) so "this is shaping up like a Mumbai Mule" reflects the **DB corpus**, not just the 15 hardcoded recipes.
- **Save → "My Mixes":** new `src/app/api/cocktails/create/route.ts` writing `CocktailCreation` (authorId from session, `isCurated:false`, `isPublic:false`) + `CocktailIngredient` rows (`sortOrder` = layer index). No schema change (model supports it). Mind `@@unique([authorId, name, sourceLabel])` — handle duplicate-name saves gracefully. Add a "My Mixes" surface reading these back via `catalog.ts`.
- **Preserve:** prefs auto-seed `touchedRef` guard (must not stomp a user-built vessel), editorial strip, Feeling Lucky, per-ingredient ✓/✗ cue.

---

## Phase 7 — Remaining performance · M · *after search-heavy features land*

- **pg_trgm GIN indexes** (raw SQL via **db push D**) for the leading-wildcard ILIKE searches actually hit by users (cocktail.name, drink.name/brand, post.title, bar.name, profile username/displayName, new ingredient search). Plain btree `@@index` does nothing for substring search.
- `/api/search`: wrap the three `type=all` queries in `Promise.all` (currently sequential; audience computed once already) — mirror `getDrinkFilters`.
- **Suspense granularity:** split the 8 page-wide `loading.tsx` files into in-layout `<Suspense>` boundaries so the shell (tabs/filters) stays painted and only the data region shows `TextLoader` on nav.
- **Hot feed** (`posts.ts:56-98`): fetch a lean candidate window (ids + score + `_count.comments`), rank, then hydrate only the top `FEED_PAGE_SIZE` with the full include. Coordinate — `HOT_WINDOW` is a ranking input, not pure perf.
- `/api/posts` GET: parallelize `getCurrentUser` + `getConnectionUserIds`; defer `recomputeKarma`/`persistMentions` on POST where they needn't block the response.

**Done already (don't "fix"):** list queries are take-bounded with lean selects + keyset pagination; pages SSR the first page then hydrate; the 10k CSV is seed-only; `BarsMap`/shader are lazy; cards use `next/image`. The brief's "unbounded findMany" worry largely doesn't hold.

### Perf P1 (cheap, pulled early into Phase 1)
- **HomeSidebar over-fetch** (`home-sidebar.tsx:37`): requests `/api/drinks?limit=5` but `getDrinks` ignores `limit` → returns a 24-row, relation-heavy, `posts._count`-aggregate page on **every authed page** to show 5 names. Add a `take?: number` param to `getDrinks` and pass `take=5`. Keep SSR + `/api/drinks` call sites in lockstep.
- Cocktail indexes (folded into db push A above).

---

## Schema change summary (each = `prisma db push` + `prisma generate` + **restart dev server**)
| Push | Phase | Change |
|---|---|---|
| A | 1 | `CocktailCreation.slug` (+ backfill), `@@index([isCurated,name])`, `@@index([category])`, `categorySlug` |
| B | 4 | `PartyPlanDrink.cocktailId` nullable (+ `drinkId` nullable, PK adjust) |
| C | 5 | `PartyGameSuggestion` + `PartyGameVote` models |
| D | 7 | pg_trgm GIN indexes (raw SQL) |

> Shared Supabase **prod** DB → `db push` only (never `migrate dev` — drift causes reset). The generated client is cached; **restart `npm run dev` after every `prisma generate`**.

## Cross-cutting constraints
- **Next.js 16, modified** (AGENTS.md): read `node_modules/next/dist/docs/` before writing route/page code; `params` is a `Promise` in page components.
- **Server Components by default**; `'use client'` only for the interactive bits (chip inputs, vessel, party action buttons). Preserve the SSR-first + `initialData` hydration pattern (page SSRs first page; client view re-fetches on filter change via a mount-guard signature ref).
- **RSC Decimal trap:** coerce `Prisma.Decimal → Number` at every server→client boundary.
- **James:** keep `james-widget.tsx`; no em-dash in James-voiced copy.

## Execution methodology (build → review loop, per your ask)
For each phase: implement → **adversarial review** (spawn a reviewer pass / `cavecrew-reviewer` on the diff, or a verify workflow) → fix findings → **verify in the browser** with the preview tools (not manual hand-off) → only then mark done. Phases 1, 3, 6 are the highest-risk and get the deepest review.

## Verification
- **Phase 1:** `/cocktails`, `/drinks`, `/vibe`, global search, and `/mix` all render via `EntryCard`/`catalog.ts`; cocktails deep-link to the new SSR detail route; `prisma generate` clean; smoke `GET /api/cocktails` + `/api/drinks` (200, real rows). Preview: snapshot each page, confirm one card style.
- **Phase 2:** as host, Remove a pending invite, a GOING invite, and a link invite; confirm row disappears optimistically and the link's Referral is dead. Non-host gets 403 on DELETE.
- **Phase 3:** add ingredients → list refreshes live with match-strength labels; "Ask James" opens the widget pre-filled. Verify both deterministic and James paths.
- **Phase 4/5:** as an invited guest (not host), suggest a cocktail and a game, upvote a game; confirm persistence after refresh and member-gating (non-member 403).
- **Phase 6:** build a layered drink → vessel animates per layer; live suggestion names a real DB cocktail; Save → appears under "My Mixes"; duplicate-name save handled.
- **Phase 7:** re-run the substring searches; confirm indexes via `EXPLAIN`; nav between routes shows a stable shell.
- Use the `preview_*` MCP tools (start → snapshot → click/fill → screenshot) for each UI phase; share screenshots as proof.

## Open items to confirm during build (not blockers)
- Category reconciliation: `normalizeCocktailCategory()` map vs full shared `Category` table — recommend the map for v1.
- Synthetic 10k rows often have incomplete ingredient lists (seed silently drops unmatched ingredients) → ingredient search will skew toward curated/complete rows. Consider a seed repair pass.
- Spirit duplication (`Drink` vs `Ingredient`) → de-dup the picker list in Phase 3; full de-dup is a stretch.
