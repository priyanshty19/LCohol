ALTER TABLE "users"
  ADD COLUMN "analytics_consent" BOOLEAN,
  ADD COLUMN "analytics_consent_updated_at" TIMESTAMP(3);
