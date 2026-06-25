# Drinks / Cocktails Data Model Map

See StructuredOutput for the full findings. This file is the scratch record.

## Two parallel concepts
- **Drink** = a bottled product (catalog item): brand, abv, priceRange, taste profile, category tree.
- **CocktailCreation** = a recipe (mixed drink): ingredients join, glass, garnish, instructions, source bar.
They do NOT share a base type. They have separate seeds, separate API routes, separate cards.

## Overlap / duplication points
1. `CocktailIngredient.drinkId` optionally links a recipe ingredient back to a `Drink` row (the only FK bridge).
2. `Ingredient` table (seed.ts) re-encodes spirits as ingredients ("Vodka"=vodka-spirit) — duplicates the `Drink` catalog spirits.
3. THREE cocktail recipe sources: DB `CocktailCreation`, hardcoded `src/lib/cocktail-recipes.ts` (Mix Lab/Vibe), and CSV seed.
4. THREE bottle/drink lists: DB `Drink`, hardcoded `BOTTLE_OPTIONS` in mix-lab-view, `vibe-config` drinkSlugs.

## Cards (divergent)
- `DrinkCard` (drinks/drink-card.tsx): image, category pill, state price, abv, counts.
- Inline cocktail card (cocktails-view.tsx): no image, glass emoji, source bar, modal recipe.
- `RecipeCard` (mix/recipe-card.tsx): emoji, difficulty, steps, availability check vs slugs.
