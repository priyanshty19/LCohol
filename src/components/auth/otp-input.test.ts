import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./otp-input.tsx", import.meta.url), "utf8");

test("OTP ring and counter-rotation continue while verification is pending", () => {
  for (const name of ["orbit", "counter"]) {
    assert.match(source, new RegExp(`otp-${name}-spin 2\\.1s linear 0\\.9s infinite`));
  }
});

test("OTP rotation stops on success or failure and respects reduced motion", () => {
  assert.match(source, /const orbiting = !reducedMotion && complete && status === "verifying";/);
  assert.match(source, /const screwed = complete && status === "success"/);
  assert.match(source, /aria-busy=\{status === "verifying"/);
});
