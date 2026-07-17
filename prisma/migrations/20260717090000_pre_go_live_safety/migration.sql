-- Vote integrity: values are +/-1 and a vote targets exactly one entity.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'votes_value_check') THEN
    ALTER TABLE "votes"
      ADD CONSTRAINT "votes_value_check" CHECK ("value" IN (-1, 1)) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'votes_single_target_check') THEN
    ALTER TABLE "votes"
      ADD CONSTRAINT "votes_single_target_check" CHECK (
        ("post_id" IS NOT NULL AND "comment_id" IS NULL)
        OR ("post_id" IS NULL AND "comment_id" IS NOT NULL)
      ) NOT VALID;
  END IF;
END $$;

-- Reconcile cached post scores with the durable vote rows.
UPDATE "posts" p
SET "score" = COALESCE(v.score, 0)
FROM (
  SELECT "post_id", SUM("value")::int AS score
  FROM "votes"
  WHERE "post_id" IS NOT NULL
  GROUP BY "post_id"
) v
WHERE p."id" = v."post_id";

UPDATE "posts" p
SET "score" = 0
WHERE NOT EXISTS (
  SELECT 1 FROM "votes" v WHERE v."post_id" = p."id"
);

-- Add multi-reason reports while preserving the existing scalar reason.
ALTER TABLE "reports"
  ADD COLUMN IF NOT EXISTS "reasons" "report_reason"[] NOT NULL DEFAULT ARRAY[]::"report_reason"[];

UPDATE "reports"
SET "reasons" = ARRAY["reason"]::"report_reason"[]
WHERE cardinality("reasons") = 0;

-- Some deployed DBs were advanced with db push, not migrations. Add the columns
-- defensively before enforcing slug uniqueness.
ALTER TABLE "cocktail_creations"
  ADD COLUMN IF NOT EXISTS "slug" varchar(220),
  ADD COLUMN IF NOT EXISTS "category_slug" varchar(80);

UPDATE "cocktail_creations"
SET "category_slug" = NULLIF(trim(both '-' from regexp_replace(lower("category"), '[^a-z0-9]+', '-', 'g')), '')
WHERE "category_slug" IS NULL
  AND "category" IS NOT NULL;

-- Backfill missing/duplicate cocktail slugs, then enforce uniqueness for future URLs.
WITH ranked AS (
  SELECT
    "id",
    "slug",
    "is_curated",
    COALESCE(
      NULLIF(trim(both '-' from left(regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g'), 207)), ''),
      'cocktail'
    ) AS base,
    row_number() OVER (
      PARTITION BY "slug"
      ORDER BY "created_at", "id"
    ) AS slug_rank
  FROM "cocktail_creations"
),
updates AS (
  SELECT
    "id",
    CASE
      WHEN "slug" IS NULL OR "slug" = '' OR slug_rank > 1 OR (NOT "is_curated" AND "slug" !~ '-[0-9a-z_-]{10}$')
        THEN left(base, 209) || '-' || substr(md5("id"::text), 1, 10)
      ELSE "slug"
    END AS next_slug
  FROM ranked
)
UPDATE "cocktail_creations" c
SET "slug" = u.next_slug
FROM updates u
WHERE c."id" = u."id"
  AND c."slug" IS DISTINCT FROM u.next_slug;

DROP INDEX IF EXISTS "cocktail_creations_slug_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "cocktail_creations_slug_key" ON "cocktail_creations"("slug");
ALTER TABLE "cocktail_creations" ALTER COLUMN "slug" SET NOT NULL;
