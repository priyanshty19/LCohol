import assert from "node:assert/strict";
import test from "node:test";
import { safeAnalyticsPageTitle, sanitizeAnalyticsPath } from "./analytics";

test("analytics paths discard query strings and fragments", () => {
  assert.equal(
    sanitizeAnalyticsPath("/login?ref=SIPSECRET&returnTo=%2Fparty%2FPRIVATE#otp"),
    "/login",
  );
});

test("analytics paths replace private dynamic identifiers", () => {
  assert.equal(sanitizeAnalyticsPath("/party/SIPSECRET"), "/party/[code]");
  assert.equal(sanitizeAnalyticsPath("/profile/FennelRinse"), "/profile/[username]");
  assert.equal(sanitizeAnalyticsPath("/post/ck_private_123"), "/post/[id]");
  assert.equal(sanitizeAnalyticsPath("/bars/a-real-slug"), "/bars/[slug]");
});

test("analytics paths preserve safe static screens", () => {
  assert.equal(sanitizeAnalyticsPath("onboarding/taste"), "/onboarding/taste");
  assert.equal(sanitizeAnalyticsPath("/cocktails"), "/cocktails");
});

test("analytics titles never expose dynamic identifiers", () => {
  assert.equal(safeAnalyticsPageTitle("/profile/FennelRinse"), "Member profile");
  assert.equal(safeAnalyticsPageTitle("/party/SIPSECRET"), "Private party invitation");
  assert.equal(safeAnalyticsPageTitle("/post/ck_private_123"), "Post details");
});
