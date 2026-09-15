import { test } from "node:test";
import assert from "node:assert/strict";
import { clerkErrorMessage } from "./clerk-errors.ts";

test("a wrong code reads as a wrong code, not as Clerk internals", () => {
  const e = {
    errors: [
      {
        code: "form_code_incorrect",
        longMessage: "Incorrect code. Please check the code and try again.",
      },
    ],
  };
  assert.equal(
    clerkErrorMessage(e, "Verification failed."),
    "That code isn't right. Check the 6 digits and try again."
  );
});

test("the developer-facing param error never reaches the guest", () => {
  // This is the exact shape behind the "`identifier` is required when
  // `strategy` is `email_code`" message that was rendering in the login card.
  const e = {
    errors: [
      {
        code: "form_param_nil",
        longMessage: "`identifier` is required when `strategy` is `email_code`.",
      },
    ],
  };
  const msg = clerkErrorMessage(e, "Verification failed.");
  assert.equal(msg, "Your sign-in timed out. Tap Resend code to get a new one.");
  assert.ok(!msg.includes("identifier"), "must not leak Clerk's parameter name");
  assert.ok(!msg.includes("`"), "must not leak Clerk's backtick formatting");
});

test("an unrecognised code falls back to the caller's wording", () => {
  const e = { errors: [{ code: "something_new", longMessage: "raw clerk text" }] };
  assert.equal(clerkErrorMessage(e, "Verification failed."), "Verification failed.");
});

test("a non-Clerk throw falls back too", () => {
  assert.equal(clerkErrorMessage(new Error("boom"), "Login failed."), "Login failed.");
  assert.equal(clerkErrorMessage(undefined, "Login failed."), "Login failed.");
});
