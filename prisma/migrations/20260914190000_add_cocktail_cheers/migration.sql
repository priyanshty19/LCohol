CREATE TABLE "cocktail_cheers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "cocktail_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cocktail_cheers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cocktail_cheers_user_id_cocktail_id_key"
ON "cocktail_cheers"("user_id", "cocktail_id");

CREATE INDEX "cocktail_cheers_cocktail_id_created_at_idx"
ON "cocktail_cheers"("cocktail_id", "created_at");

CREATE INDEX "cocktail_cheers_user_id_idx"
ON "cocktail_cheers"("user_id");

ALTER TABLE "cocktail_cheers"
ADD CONSTRAINT "cocktail_cheers_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cocktail_cheers"
ADD CONSTRAINT "cocktail_cheers_cocktail_id_fkey"
FOREIGN KEY ("cocktail_id") REFERENCES "cocktail_creations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
