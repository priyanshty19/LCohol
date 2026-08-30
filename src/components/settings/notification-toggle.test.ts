import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./notification-toggle.tsx", import.meta.url), "utf8");

test("notification permission is requested before asynchronous service-worker setup", () => {
  const enableSource = source.slice(source.indexOf("async function enable"));
  const permissionRequest = enableSource.indexOf("Notification.requestPermission()");
  const workerRegistration = enableSource.indexOf("navigator.serviceWorker.register(");

  assert.notEqual(permissionRequest, -1);
  assert.notEqual(workerRegistration, -1);
  assert.ok(
    permissionRequest < workerRegistration,
    "WebKit requires the permission request to remain tied to the user's Enable tap",
  );
});

test("iPhone users receive Home Screen installation guidance", () => {
  assert.match(source, /Add Sip Stories to your Home Screen/);
});

test("installed apps are not rejected by the unreliable window PushManager global", () => {
  assert.doesNotMatch(source, /Reflect\.has\(window, "PushManager"\)/);
  assert.match(source, /registration\.pushManager/);
});

test("the UI delegates platform support decisions to the tested capability model", () => {
  assert.match(source, /resolvePushCapability/);
});
