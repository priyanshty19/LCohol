import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../prisma/migrations/20260901010000_native_push_subscriptions/migration.sql", import.meta.url),
  "utf8",
);

test("native device tokens are not exposed through the Supabase Data API", () => {
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON TABLE "native_push_subscriptions" FROM anon, authenticated/);
});
