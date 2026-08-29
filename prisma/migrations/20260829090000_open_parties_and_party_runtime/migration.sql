-- Party runtime schema: these fields and collaboration tables existed in the
-- Prisma model and UI but had never been represented in migration history.
CREATE TYPE "party_status" AS ENUM ('UPCOMING', 'CANCELLED', 'PAST');
CREATE TYPE "rsvp_status" AS ENUM ('INVITED', 'GOING', 'MAYBE', 'DECLINED');

ALTER TABLE "party_plans"
  ADD COLUMN "starts_at" TIMESTAMP(3),
  ADD COLUMN "location_text" VARCHAR(200),
  ADD COLUMN "bar_id" UUID,
  ADD COLUMN "status" "party_status" NOT NULL DEFAULT 'UPCOMING',
  ADD COLUMN "visibility" "post_visibility" NOT NULL DEFAULT 'CIRCLE';

-- Preserve the older date-only plans in the new sortable timestamp field.
UPDATE "party_plans" SET "starts_at" = "event_date"::timestamp WHERE "starts_at" IS NULL AND "event_date" IS NOT NULL;

CREATE INDEX "party_plans_bar_id_idx" ON "party_plans"("bar_id");
ALTER TABLE "party_plans" ADD CONSTRAINT "party_plans_bar_id_fkey"
  FOREIGN KEY ("bar_id") REFERENCES "bars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "party_invites" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "party_plan_id" UUID NOT NULL,
  "inviter_id" UUID NOT NULL,
  "invited_user_id" UUID,
  "code" TEXT,
  "rsvp" "rsvp_status" NOT NULL DEFAULT 'INVITED',
  "expires_at" TIMESTAMP(3),
  "responded_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "party_invites_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "party_invites_code_key" ON "party_invites"("code");
CREATE UNIQUE INDEX "party_invites_party_plan_id_invited_user_id_key" ON "party_invites"("party_plan_id", "invited_user_id");
CREATE INDEX "party_invites_party_plan_id_idx" ON "party_invites"("party_plan_id");
CREATE INDEX "party_invites_invited_user_id_idx" ON "party_invites"("invited_user_id");
ALTER TABLE "party_invites" ADD CONSTRAINT "party_invites_party_plan_id_fkey" FOREIGN KEY ("party_plan_id") REFERENCES "party_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "party_invites" ADD CONSTRAINT "party_invites_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "party_invites" ADD CONSTRAINT "party_invites_invited_user_id_fkey" FOREIGN KEY ("invited_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "party_drink_suggestions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "party_plan_id" UUID NOT NULL,
  "suggested_by_id" UUID NOT NULL,
  "drink_id" UUID,
  "cocktail_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "party_drink_suggestions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "party_drink_suggestions_one_item_check" CHECK (("drink_id" IS NOT NULL) <> ("cocktail_id" IS NOT NULL))
);
CREATE INDEX "party_drink_suggestions_party_plan_id_idx" ON "party_drink_suggestions"("party_plan_id");
ALTER TABLE "party_drink_suggestions" ADD CONSTRAINT "party_drink_suggestions_party_plan_id_fkey" FOREIGN KEY ("party_plan_id") REFERENCES "party_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "party_drink_suggestions" ADD CONSTRAINT "party_drink_suggestions_suggested_by_id_fkey" FOREIGN KEY ("suggested_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "party_drink_suggestions" ADD CONSTRAINT "party_drink_suggestions_drink_id_fkey" FOREIGN KEY ("drink_id") REFERENCES "drinks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "party_drink_suggestions" ADD CONSTRAINT "party_drink_suggestions_cocktail_id_fkey" FOREIGN KEY ("cocktail_id") REFERENCES "cocktail_creations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "party_game_suggestions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "party_plan_id" UUID NOT NULL,
  "suggested_by_id" UUID NOT NULL,
  "text" VARCHAR(200) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "party_game_suggestions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "party_game_suggestions_party_plan_id_idx" ON "party_game_suggestions"("party_plan_id");
ALTER TABLE "party_game_suggestions" ADD CONSTRAINT "party_game_suggestions_party_plan_id_fkey" FOREIGN KEY ("party_plan_id") REFERENCES "party_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "party_game_suggestions" ADD CONSTRAINT "party_game_suggestions_suggested_by_id_fkey" FOREIGN KEY ("suggested_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "party_game_votes" (
  "game_suggestion_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "party_game_votes_pkey" PRIMARY KEY ("game_suggestion_id", "user_id")
);
ALTER TABLE "party_game_votes" ADD CONSTRAINT "party_game_votes_game_suggestion_id_fkey" FOREIGN KEY ("game_suggestion_id") REFERENCES "party_game_suggestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "party_game_votes" ADD CONSTRAINT "party_game_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
