import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalizeEmail } from "./email-normalize.ts";

test("lowercases and trims", () => {
  assert.equal(canonicalizeEmail("  Foo@Example.COM "), "foo@example.com");
});

test("Gmail: strips dots and +tags, collapses googlemail", () => {
  assert.equal(canonicalizeEmail("a.b.c@gmail.com"), "abc@gmail.com");
  assert.equal(canonicalizeEmail("ab+promo@gmail.com"), "ab@gmail.com");
  assert.equal(canonicalizeEmail("a.b+x@googlemail.com"), "ab@gmail.com");
  // The prod bug: all three forms must resolve to ONE identity.
  const forms = ["priyansh.tyagi@gmail.com", "priyanshtyagi@gmail.com", "priyansh.tyagi+news@googlemail.com"];
  const canon = forms.map(canonicalizeEmail);
  assert.equal(new Set(canon).size, 1, "gmail variants should canonicalize identically");
});

test("non-Gmail keeps dots (they are significant there)", () => {
  assert.equal(canonicalizeEmail("a.b@outlook.com"), "a.b@outlook.com");
  assert.equal(canonicalizeEmail("First.Last@company.co.in"), "first.last@company.co.in");
});

test("degenerate input returns as-is (validation handles it)", () => {
  assert.equal(canonicalizeEmail(""), "");
  assert.equal(canonicalizeEmail(null), "");
  assert.equal(canonicalizeEmail("notanemail"), "notanemail");
});
