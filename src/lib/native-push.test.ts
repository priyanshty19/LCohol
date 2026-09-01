import assert from "node:assert/strict";
import test from "node:test";
import { nativeIosPushEnabled, normalizeNativeDeviceToken } from "./native-push";

test("native device tokens are normalized and validated without assuming a fixed APNs length", () => {
  assert.equal(normalizeNativeDeviceToken(`  ${"AB".repeat(32)}  `), "ab".repeat(32));
  assert.equal(normalizeNativeDeviceToken("abc"), null);
  assert.equal(normalizeNativeDeviceToken("zz".repeat(32)), null);
});

test("native iOS delivery is released only through its explicit flag", () => {
  assert.equal(nativeIosPushEnabled({}), false);
  assert.equal(nativeIosPushEnabled({ NATIVE_IOS_PUSH_ENABLED: " true " }), true);
});
