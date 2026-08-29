-- The following soft-drink data migration inserts rows directly rather than
-- through Prisma, so the required timestamp needs a database default.
ALTER TABLE "drinks"
  ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
