import assert from "node:assert/strict";
import test from "node:test";
import { persistOnboardingProfile } from "./onboarding-profile";

test("onboarding persistence rejects non-success responses", async () => {
  await assert.rejects(
    persistOnboardingProfile(
      { onboarded: true },
      async () => ({ ok: false }),
    ),
    /Profile update failed/,
  );
});

test("onboarding persistence sends the profile patch and resolves on success", async () => {
  let capturedInput = "";
  let capturedInit: RequestInit | undefined;

  await persistOnboardingProfile(
    { preferredSpirits: ["gin-tonic"], onboarded: true },
    async (input, init) => {
      capturedInput = input;
      capturedInit = init;
      return { ok: true };
    },
  );

  assert.equal(capturedInput, "/api/profile");
  assert.equal(capturedInit?.method, "PATCH");
  assert.deepEqual(JSON.parse(String(capturedInit?.body)), {
    preferredSpirits: ["gin-tonic"],
    onboarded: true,
  });
});
