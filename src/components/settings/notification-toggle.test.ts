import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./notification-toggle.tsx", import.meta.url), "utf8");

test("notification permission is requested directly from the Enable tap when exposed", () => {
  const enableSource = source.slice(source.indexOf("async function enable"));
  const permissionRequest = enableSource.indexOf("Notification.requestPermission()");

  assert.notEqual(permissionRequest, -1);
  assert.match(enableSource, /if \("Notification" in window\)/);
});

test("installed iPhone apps can subscribe when window.Notification is absent", () => {
  const enableSource = source.slice(source.indexOf("async function enable"));

  assert.match(enableSource, /registrationRef\.current/);
  assert.match(enableSource, /registration\.pushManager\.subscribe/);
});

test("iPhone users receive Home Screen installation guidance", () => {
  assert.match(source, /Add Sip Stories to your Home Screen/);
});

test("stale iPhone installations receive explicit reinstall guidance", () => {
  assert.match(source, /installed before Web Push was enabled/);
  assert.match(source, /Remove this Sip Stories/);
  assert.match(source, /Open as Web App switch/);
});

test("the native iPhone wrapper delegates permission and token registration to Apple", () => {
  assert.match(source, /SipStoriesIOS\\\//);
  assert.match(source, /sipStoriesNotifications/);
  assert.match(source, /action: "request"/);
  assert.match(source, /sipstories:native-notification/);
  assert.match(source, /\/api\/push\/native\/subscribe/);
  assert.match(source, /rememberNativePushToken/);
});

test("installed apps are not rejected by the unreliable window PushManager global", () => {
  assert.doesNotMatch(source, /Reflect\.has\(window, "PushManager"\)/);
  assert.match(source, /registration\.pushManager/);
});

test("the UI delegates platform support decisions to the tested capability model", () => {
  assert.match(source, /resolvePushCapability/);
});
