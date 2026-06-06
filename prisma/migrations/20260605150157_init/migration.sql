-- CreateEnum
CREATE TYPE "drinking_style" AS ENUM ('SOCIAL', 'CONNOISSEUR', 'OCCASIONAL', 'EXPLORER', 'PARTY_ANIMAL', 'MIXOLOGIST', 'SOBER_CURIOUS');

-- CreateEnum
CREATE TYPE "post_type" AS ENUM ('STORY', 'QUESTION', 'REVIEW', 'RECOMMENDATION', 'MEME');

-- CreateEnum
CREATE TYPE "tag_type" AS ENUM ('OCCASION', 'MOOD', 'TOPIC', 'CUSTOM');

-- CreateEnum
CREATE TYPE "price_range" AS ENUM ('BUDGET', 'MID_RANGE', 'PREMIUM', 'LUXURY');

-- CreateEnum
CREATE TYPE "occasion" AS ENUM ('DATE_NIGHT', 'HOUSE_PARTY', 'CLUB_NIGHT', 'CASUAL_HANGOUT', 'CELEBRATION', 'SOLO_RELAXATION', 'BUSINESS_DINNER', 'OUTDOOR_BBQ', 'FESTIVAL', 'WEEKEND_CHILL');

-- CreateEnum
CREATE TYPE "mood" AS ENUM ('ADVENTUROUS', 'ROMANTIC', 'RELAXED', 'ENERGETIC', 'SOPHISTICATED', 'NOSTALGIC', 'CELEBRATORY', 'CONTEMPLATIVE');

-- CreateEnum
CREATE TYPE "ingredient_category" AS ENUM ('SPIRIT', 'MIXER', 'JUICE', 'SYRUP', 'BITTERS', 'GARNISH', 'ICE', 'OTHER');

-- CreateEnum
CREATE TYPE "score_type" AS ENUM ('FUN', 'PARTY', 'DATE', 'CHILL', 'HANGOVER', 'VALUE_FOR_MONEY');

-- CreateEnum
CREATE TYPE "budget_range" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'NO_LIMIT');

-- CreateEnum
CREATE TYPE "water_intake" AS ENUM ('NONE', 'SOME', 'ADEQUATE', 'PLENTY');

-- CreateEnum
CREATE TYPE "interaction_type" AS ENUM ('VIEW', 'SEARCH', 'UPVOTE', 'DOWNVOTE', 'BOOKMARK', 'SHARE', 'CLICK_DRINK', 'CREATE_COCKTAIL', 'CREATE_POST');

-- CreateEnum
CREATE TYPE "target_type" AS ENUM ('POST', 'COMMENT', 'DRINK', 'COCKTAIL', 'PROFILE', 'SEARCH_QUERY');

-- CreateEnum
CREATE TYPE "report_reason" AS ENUM ('SPAM', 'HARASSMENT', 'UNDERAGE_CONTENT', 'PROMOTES_EXCESSIVE_DRINKING', 'DRUNK_DRIVING', 'ILLEGAL_ACTIVITY', 'MISINFORMATION', 'OTHER');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('PENDING', 'REVIEWED', 'ACTION_TAKEN', 'DISMISSED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dob" DATE NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "username" VARCHAR(30) NOT NULL,
    "display_name" VARCHAR(50),
    "bio" VARCHAR(300),
    "avatar_url" TEXT,
    "karma" INTEGER NOT NULL DEFAULT 0,
    "drinking_style" "drinking_style",
    "favorite_drink_id" UUID,
    "state" VARCHAR(50),
    "city" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "author_id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "body" TEXT,
    "post_type" "post_type" NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "parent_id" UUID,
    "body" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "post_id" UUID,
    "comment_id" UUID,
    "value" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "tag_type" "tag_type" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_tags" (
    "post_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "post_tags_pkey" PRIMARY KEY ("post_id","tag_id")
);

-- CreateTable
CREATE TABLE "post_drinks" (
    "post_id" UUID NOT NULL,
    "drink_id" UUID NOT NULL,

    CONSTRAINT "post_drinks_pkey" PRIMARY KEY ("post_id","drink_id")
);

-- CreateTable
CREATE TABLE "drink_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "description" TEXT,
    "icon_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drink_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drink_subcategories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drink_subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drinks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID NOT NULL,
    "subcategory_id" UUID,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(220) NOT NULL,
    "brand" VARCHAR(100),
    "variant" VARCHAR(100),
    "description" TEXT,
    "country" VARCHAR(50),
    "abv" DECIMAL(4,1),
    "price_range" "price_range",
    "image_url" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_user_submitted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drinks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drink_taste_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "drink_id" UUID NOT NULL,
    "sweetness" SMALLINT NOT NULL DEFAULT 0,
    "bitterness" SMALLINT NOT NULL DEFAULT 0,
    "sourness" SMALLINT NOT NULL DEFAULT 0,
    "smokiness" SMALLINT NOT NULL DEFAULT 0,
    "spiciness" SMALLINT NOT NULL DEFAULT 0,
    "fruitiness" SMALLINT NOT NULL DEFAULT 0,
    "floral" SMALLINT NOT NULL DEFAULT 0,
    "body" SMALLINT NOT NULL DEFAULT 0,
    "finish" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "drink_taste_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drink_occasions" (
    "drink_id" UUID NOT NULL,
    "occasion" "occasion" NOT NULL,

    CONSTRAINT "drink_occasions_pkey" PRIMARY KEY ("drink_id","occasion")
);

-- CreateTable
CREATE TABLE "drink_moods" (
    "drink_id" UUID NOT NULL,
    "mood" "mood" NOT NULL,

    CONSTRAINT "drink_moods_pkey" PRIMARY KEY ("drink_id","mood")
);

-- CreateTable
CREATE TABLE "drink_food_pairings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "drink_id" UUID NOT NULL,
    "food" VARCHAR(100) NOT NULL,

    CONSTRAINT "drink_food_pairings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drink_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "drink_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "body" TEXT,
    "occasion" "occasion",
    "mood" "mood",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drink_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(110) NOT NULL,
    "category" "ingredient_category" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cocktail_creations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "author_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "image_url" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cocktail_creations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cocktail_ingredients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cocktail_id" UUID NOT NULL,
    "ingredient_id" UUID,
    "drink_id" UUID,
    "quantity" VARCHAR(50),
    "unit" VARCHAR(20),
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cocktail_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_scores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "drink_id" UUID NOT NULL,
    "score_type" "score_type" NOT NULL,
    "value" DECIMAL(3,1) NOT NULL,
    "sample_size" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "author_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "guest_count" INTEGER,
    "budget" "budget_range",
    "occasion" "occasion",
    "event_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "party_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_plan_drinks" (
    "party_plan_id" UUID NOT NULL,
    "drink_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,

    CONSTRAINT "party_plan_drinks_pkey" PRIMARY KEY ("party_plan_id","drink_id")
);

-- CreateTable
CREATE TABLE "hangover_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "author_id" UUID NOT NULL,
    "severity" SMALLINT NOT NULL,
    "drinks_mixed" BOOLEAN NOT NULL DEFAULT false,
    "water_intake" "water_intake",
    "food_before" BOOLEAN,
    "hours_slept" DECIMAL(3,1),
    "recovery_tip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hangover_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_interactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "interaction_type" "interaction_type" NOT NULL,
    "target_type" "target_type" NOT NULL,
    "target_id" UUID NOT NULL,
    "context" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reporter_id" UUID NOT NULL,
    "post_id" UUID,
    "comment_id" UUID,
    "reason" "report_reason" NOT NULL,
    "details" TEXT,
    "status" "report_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_id_key" ON "users"("auth_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_username_key" ON "profiles"("username");

-- CreateIndex
CREATE INDEX "profiles_username_idx" ON "profiles"("username");

-- CreateIndex
CREATE INDEX "posts_author_id_idx" ON "posts"("author_id");

-- CreateIndex
CREATE INDEX "posts_created_at_idx" ON "posts"("created_at");

-- CreateIndex
CREATE INDEX "posts_score_idx" ON "posts"("score");

-- CreateIndex
CREATE INDEX "posts_post_type_idx" ON "posts"("post_type");

-- CreateIndex
CREATE INDEX "comments_post_id_idx" ON "comments"("post_id");

-- CreateIndex
CREATE INDEX "comments_author_id_idx" ON "comments"("author_id");

-- CreateIndex
CREATE INDEX "comments_parent_id_idx" ON "comments"("parent_id");

-- CreateIndex
CREATE INDEX "votes_post_id_idx" ON "votes"("post_id");

-- CreateIndex
CREATE INDEX "votes_comment_id_idx" ON "votes"("comment_id");

-- CreateIndex
CREATE UNIQUE INDEX "votes_user_id_post_id_key" ON "votes"("user_id", "post_id");

-- CreateIndex
CREATE UNIQUE INDEX "votes_user_id_comment_id_key" ON "votes"("user_id", "comment_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "tags_slug_idx" ON "tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "drink_categories_name_key" ON "drink_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "drink_categories_slug_key" ON "drink_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "drink_subcategories_slug_key" ON "drink_subcategories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "drink_subcategories_category_id_name_key" ON "drink_subcategories"("category_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "drinks_slug_key" ON "drinks"("slug");

-- CreateIndex
CREATE INDEX "drinks_category_id_idx" ON "drinks"("category_id");

-- CreateIndex
CREATE INDEX "drinks_subcategory_id_idx" ON "drinks"("subcategory_id");

-- CreateIndex
CREATE INDEX "drinks_name_idx" ON "drinks"("name");

-- CreateIndex
CREATE INDEX "drinks_brand_idx" ON "drinks"("brand");

-- CreateIndex
CREATE UNIQUE INDEX "drink_taste_profiles_drink_id_key" ON "drink_taste_profiles"("drink_id");

-- CreateIndex
CREATE UNIQUE INDEX "drink_food_pairings_drink_id_food_key" ON "drink_food_pairings"("drink_id", "food");

-- CreateIndex
CREATE INDEX "drink_reviews_drink_id_idx" ON "drink_reviews"("drink_id");

-- CreateIndex
CREATE UNIQUE INDEX "drink_reviews_drink_id_author_id_key" ON "drink_reviews"("drink_id", "author_id");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_name_key" ON "ingredients"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_slug_key" ON "ingredients"("slug");

-- CreateIndex
CREATE INDEX "cocktail_creations_author_id_idx" ON "cocktail_creations"("author_id");

-- CreateIndex
CREATE INDEX "cocktail_creations_score_idx" ON "cocktail_creations"("score");

-- CreateIndex
CREATE UNIQUE INDEX "community_scores_drink_id_score_type_key" ON "community_scores"("drink_id", "score_type");

-- CreateIndex
CREATE INDEX "party_plans_author_id_idx" ON "party_plans"("author_id");

-- CreateIndex
CREATE INDEX "hangover_logs_author_id_idx" ON "hangover_logs"("author_id");

-- CreateIndex
CREATE INDEX "user_interactions_user_id_idx" ON "user_interactions"("user_id");

-- CreateIndex
CREATE INDEX "user_interactions_target_type_target_id_idx" ON "user_interactions"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "user_interactions_created_at_idx" ON "user_interactions"("created_at");

-- CreateIndex
CREATE INDEX "user_interactions_interaction_type_idx" ON "user_interactions"("interaction_type");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_created_at_idx" ON "reports"("created_at");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_favorite_drink_id_fkey" FOREIGN KEY ("favorite_drink_id") REFERENCES "drinks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_drinks" ADD CONSTRAINT "post_drinks_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_drinks" ADD CONSTRAINT "post_drinks_drink_id_fkey" FOREIGN KEY ("drink_id") REFERENCES "drinks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drink_subcategories" ADD CONSTRAINT "drink_subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "drink_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drinks" ADD CONSTRAINT "drinks_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "drink_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drinks" ADD CONSTRAINT "drinks_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "drink_subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drink_taste_profiles" ADD CONSTRAINT "drink_taste_profiles_drink_id_fkey" FOREIGN KEY ("drink_id") REFERENCES "drinks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drink_occasions" ADD CONSTRAINT "drink_occasions_drink_id_fkey" FOREIGN KEY ("drink_id") REFERENCES "drinks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drink_moods" ADD CONSTRAINT "drink_moods_drink_id_fkey" FOREIGN KEY ("drink_id") REFERENCES "drinks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drink_food_pairings" ADD CONSTRAINT "drink_food_pairings_drink_id_fkey" FOREIGN KEY ("drink_id") REFERENCES "drinks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drink_reviews" ADD CONSTRAINT "drink_reviews_drink_id_fkey" FOREIGN KEY ("drink_id") REFERENCES "drinks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drink_reviews" ADD CONSTRAINT "drink_reviews_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cocktail_creations" ADD CONSTRAINT "cocktail_creations_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cocktail_ingredients" ADD CONSTRAINT "cocktail_ingredients_cocktail_id_fkey" FOREIGN KEY ("cocktail_id") REFERENCES "cocktail_creations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cocktail_ingredients" ADD CONSTRAINT "cocktail_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cocktail_ingredients" ADD CONSTRAINT "cocktail_ingredients_drink_id_fkey" FOREIGN KEY ("drink_id") REFERENCES "drinks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_scores" ADD CONSTRAINT "community_scores_drink_id_fkey" FOREIGN KEY ("drink_id") REFERENCES "drinks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_plans" ADD CONSTRAINT "party_plans_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_plan_drinks" ADD CONSTRAINT "party_plan_drinks_party_plan_id_fkey" FOREIGN KEY ("party_plan_id") REFERENCES "party_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_plan_drinks" ADD CONSTRAINT "party_plan_drinks_drink_id_fkey" FOREIGN KEY ("drink_id") REFERENCES "drinks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hangover_logs" ADD CONSTRAINT "hangover_logs_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_interactions" ADD CONSTRAINT "user_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
