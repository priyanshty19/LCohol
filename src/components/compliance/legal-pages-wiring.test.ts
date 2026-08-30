import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const privacySource = readFileSync(
  new URL("../../app/(main)/compliance/privacy/page.tsx", import.meta.url),
  "utf8",
);
const termsSource = readFileSync(
  new URL("../../app/(main)/compliance/terms/page.tsx", import.meta.url),
  "utf8",
);
const settingsSource = readFileSync(
  new URL("../shared/settings-view.tsx", import.meta.url),
  "utf8",
);

test("privacy choices live in the Privacy Policy instead of Settings", () => {
  assert.match(privacySource, /AnalyticsPrivacySetting/);
  assert.doesNotMatch(settingsSource, /AnalyticsPrivacySetting/);
});

test("both legal pages expose the shared close control", () => {
  assert.match(privacySource, /LegalPageClose/);
  assert.match(termsSource, /LegalPageClose/);
});
