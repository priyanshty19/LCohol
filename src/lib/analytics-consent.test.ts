import assert from "node:assert/strict";
import test from "node:test";
import { resolveInitialAnalyticsConsent } from "./analytics-consent";

test("an account preference wins across devices and cookie state", () => {
  assert.deepEqual(resolveInitialAnalyticsConsent("denied", "granted", true), {
    consent: "denied",
    shouldPrompt: false,
    shouldPersistCookieToAccount: false,
  });
});

test("an existing cookie is migrated into a signed-in account once", () => {
  assert.deepEqual(resolveInitialAnalyticsConsent(null, "granted", true), {
    consent: "granted",
    shouldPrompt: false,
    shouldPersistCookieToAccount: true,
  });
});

test("a signed-in user with no saved choice is prompted once", () => {
  assert.deepEqual(resolveInitialAnalyticsConsent(null, null, true), {
    consent: null,
    shouldPrompt: true,
    shouldPersistCookieToAccount: false,
  });
});

test("signed-out visitors retain the cookie-only fallback", () => {
  assert.deepEqual(resolveInitialAnalyticsConsent(null, "denied", false), {
    consent: "denied",
    shouldPrompt: false,
    shouldPersistCookieToAccount: false,
  });
});
