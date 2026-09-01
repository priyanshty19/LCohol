import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync(new URL("../../prisma/schema.prisma", import.meta.url), "utf8");
const cleanup = readFileSync(
  new URL(
    "../../prisma/migrations/20260901020000_drop_obsolete_analytics_consent/migration.sql",
    import.meta.url,
  ),
  "utf8",
);

test("the historical analytics columns are removed from the final schema", () => {
  assert.doesNotMatch(schema, /analyticsConsent/);
  assert.match(cleanup, /DROP COLUMN IF EXISTS "analytics_consent"/);
  assert.match(cleanup, /DROP COLUMN IF EXISTS "analytics_consent_updated_at"/);
});
