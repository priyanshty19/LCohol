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

export type FeedSortOption = "hot" | "new" | "top";

export type TimePeriod = "day" | "week" | "month" | "year" | "all";

export type { PostType, PriceRange, Occasion, Mood };
