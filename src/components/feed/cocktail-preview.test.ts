import assert from "node:assert/strict";
import test from "node:test";
import { cocktailSlugFromBody } from "./cocktail-preview";

test("shared cocktail cards preserve legacy underscore suffixes", () => {
  assert.equal(
    cocktailSlugFromBody("Try it or remix it: /cocktails/devils-poison-ab12_cd34"),
    "devils-poison-ab12_cd34",
  );
});

test("shared cocktail cards read readable legacy links", () => {
  assert.equal(cocktailSlugFromBody("View recipe: /cocktails/devils-poison"), "devils-poison");
});
