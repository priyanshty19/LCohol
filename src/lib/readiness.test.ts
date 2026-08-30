import assert from "node:assert/strict";
import test from "node:test";
import { configuredRuntimeServices } from "./readiness";

const COMPLETE_ENV = {
  GOOGLE_MAPS_API_KEY: "maps-key",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "storage-key",
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: "public-vapid",
  VAPID_PUBLIC_KEY: "public-vapid",
  VAPID_PRIVATE_KEY: "private-vapid",
  VAPID_SUBJECT: "mailto:ops@example.com",
};

test("production dependencies are ready only when every required secret is present", () => {
  assert.deepEqual(configuredRuntimeServices(COMPLETE_ENV), {
    googlePlaces: true,
    imageUploads: true,
    webPush: true,
  });
});

test("mismatched public push keys are reported as an unhealthy push configuration", () => {
  assert.deepEqual(
    configuredRuntimeServices({
      ...COMPLETE_ENV,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "browser-key",
      VAPID_PUBLIC_KEY: "server-key",
    }),
    { googlePlaces: true, imageUploads: true, webPush: false },
  );
});

test("missing provider configuration is visible instead of becoming an empty UI", () => {
  assert.deepEqual(configuredRuntimeServices({}), {
    googlePlaces: false,
    imageUploads: false,
    webPush: false,
  });
});
