import assert from "node:assert/strict";
import test from "node:test";
import { resolvePushCapability } from "./push-capability";

const base = {
  appleMobile: false,
  standalone: false,
  serviceWorkerAvailable: true,
  notificationAvailable: true,
  vapidConfigured: true,
};

test("ordinary iPhone Safari receives Home Screen guidance", () => {
  assert.equal(
    resolvePushCapability({
      ...base,
      appleMobile: true,
      notificationAvailable: false,
    }),
    "install-required",
  );
});

test("an installed iPhone app is eligible without a window Notification global", () => {
  assert.equal(
    resolvePushCapability({
      ...base,
      appleMobile: true,
      standalone: true,
      notificationAvailable: false,
    }),
    "available",
  );
});

test("standalone mode wins when an installed app reports a desktop-style user agent", () => {
  assert.equal(
    resolvePushCapability({
      ...base,
      standalone: true,
      notificationAvailable: false,
    }),
    "available",
  );
});

test("missing required configuration or platform APIs remains unsupported", () => {
  assert.equal(resolvePushCapability({ ...base, vapidConfigured: false }), "unsupported");
  assert.equal(
    resolvePushCapability({ ...base, serviceWorkerAvailable: false }),
    "unsupported",
  );
  assert.equal(
    resolvePushCapability({ ...base, notificationAvailable: false }),
    "unsupported",
  );
});
