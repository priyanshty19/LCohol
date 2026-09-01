-- Analytics consent now lives in user_interactions so it can be audited without
-- widening the account record. Remove the short-lived columns from the earlier
-- migration and keep the full migration chain reproducible on every database.
ALTER TABLE "users"
  DROP COLUMN IF EXISTS "analytics_consent",
  DROP COLUMN IF EXISTS "analytics_consent_updated_at";
