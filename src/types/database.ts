import type {
  PostModel,
  CommentModel,
  VoteModel,
  ProfileModel,
  DrinkModel,
  DrinkCategoryModel,
  DrinkSubcategoryModel,
  DrinkTasteProfileModel,
  TagModel,
  CommunityScoreModel,
  DrinkReviewModel,
} from "@/generated/prisma/models";

import type {
  PostType,
  PriceRange,
  Occasion,
  Mood,
} from "@/generated/prisma/enums";

export type Post = PostModel;
export type Comment = CommentModel;
export type Vote = VoteModel;
export type Profile = ProfileModel;
export type Drink = DrinkModel;
export type DrinkCategory = DrinkCategoryModel;
export type DrinkSubcategory = DrinkSubcategoryModel;
export type DrinkTasteProfile = DrinkTasteProfileModel;
export type Tag = TagModel;
export type CommunityScore = CommunityScoreModel;
export type DrinkReview = DrinkReviewModel;

export type PostWithRelations = Post & {
  author: { profile: Pick<Profile, "username" | "displayName" | "avatarUrl"> | null };
  tags: { tag: Tag }[];
  drinks: { drink: Pick<Drink, "id" | "name" | "slug" | "imageUrl"> }[];
  _count: { comments: number; votes: number };
  imageUrl?: string | null;
  userVote?: number | null;
};

export type CommentWithRelations = Comment & {
  author: { profile: Pick<Profile, "username" | "displayName" | "avatarUrl"> | null };
  replies?: CommentWithRelations[];
  _count: { replies: number };
  userVote?: number | null;
};

export type DrinkWithRelations = Drink & {
  category: DrinkCategory;
  subcategory: DrinkSubcategory | null;
  tasteProfile: DrinkTasteProfile | null;
  occasions: { occasion: Occasion }[];
  moods: { mood: Mood }[];
  foodPairings: { food: string }[];
  communityScores: CommunityScore[];
  _count: { reviews: number; posts: number };
};

export type ProfileWithStats = Profile & {
  user: { _count: { posts: number; comments: number } };
};

export type FeedSortOption = "for-you" | "hot" | "new" | "top";

export type TimePeriod = "day" | "week" | "month" | "year" | "all";

export type { PostType, PriceRange, Occasion, Mood };

// ============================================================================
// CATALOG — the canonical unified shape for "a thing you can drink".
// Promoted from the merged CatalogItem in src/lib/james/search.ts so drinks and
// cocktails share ONE type + ONE display component instead of three divergent
// shapes. Discriminated on `kind`; map Prisma rows into this via src/lib/catalog.ts.
// ============================================================================

export type CatalogKind = "drink" | "cocktail";

export type CatalogIngredientRef = {
  name: string;
  // Ingredient.slug / .category are non-nullable in the schema. A recipe line
  // that points at a Drink instead is represented by the sibling `drink` field,
  // not here — so within an ingredient ref these are always present.
  slug: string;
  /** IngredientCategory enum value (SPIRIT | MIXER | JUICE | SYRUP | …). */
  category: string;
};

type CatalogCore = {
  id: string;
  kind: CatalogKind;
  name: string;
  /** Deep-link slug. Drinks always have one; cocktails do after the backfill. */
  slug: string | null;
  /** Human display label for the category. */
  category: string | null;
  /** Controlled, normalized category slug for filtering. */
  categorySlug: string | null;
  imageUrl: string | null;
  /** One-line secondary label (brand, or source bar/glass). */
  subtitle: string | null;
};

export type CatalogDrinkEntry = CatalogCore & {
  kind: "drink";
  brand: string | null;
  abv: number | null;
  priceRange: string | null;
  basePriceInr: number | null;
  subcategory: string | null;
  counts: { reviews: number; posts: number };
};

export type CatalogCocktailEntry = CatalogCore & {
  kind: "cocktail";
  glass: string | null;
  garnish: string | null;
  instructions: string | null;
  isCurated: boolean;
  sourceBar: { id: string; name: string; slug: string; city: string } | null;
  sourceLabel: string | null;
  ingredients: {
    sortOrder: number;
    ingredient: CatalogIngredientRef | null;
    drink: { name: string; slug: string } | null;
  }[];
};

export type CatalogEntry = CatalogDrinkEntry | CatalogCocktailEntry;
