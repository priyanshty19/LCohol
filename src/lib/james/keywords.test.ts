import { test } from "node:test";
import assert from "node:assert/strict";
import { jamesKeywords } from "./keywords.ts";

test("summarises a James question into compact keywords", () => {
  assert.deepEqual(jamesKeywords("What cocktail should I make with gin and tonic tonight?"), ["cocktail", "gin", "tonic", "tonight"]);
});
