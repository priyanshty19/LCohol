import assert from "node:assert/strict";
import test from "node:test";
import { isApnsConfigured, resolveApnsConfig } from "./apns";

const configured = {
  APNS_KEY_ID: "KEY1234567",
  APNS_TEAM_ID: "TEAM123456",
  APNS_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nsecret\\n-----END PRIVATE KEY-----",
  APNS_BUNDLE_ID: "com.sipstories.ios",
};

test("APNs configuration is disabled until every credential is present", () => {
  assert.equal(isApnsConfigured({}), false);
  assert.equal(isApnsConfigured({ ...configured, APNS_KEY_ID: "" }), false);
});

test("APNs configuration normalizes multiline keys and defaults to sandbox", () => {
  const result = resolveApnsConfig(configured);
  assert.ok(result);
  assert.equal(result.environment, "sandbox");
  assert.match(result.privateKey, /PRIVATE KEY-----\nsecret\n/);
});

test("APNs production endpoint is selected only when explicitly configured", () => {
  assert.equal(
    resolveApnsConfig({ ...configured, APNS_ENVIRONMENT: "production" })?.environment,
    "production",
  );
});
