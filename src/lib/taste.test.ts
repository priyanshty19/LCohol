import { test } from "node:test";
import assert from "node:assert/strict";
import { profileTasteVector, topTasteKeywords } from "./taste.ts";

test("onboarding choices seed a usable taste profile", () => {
  const vector = profileTasteVector({
    preferredSpirits: ["diet-coke"],
    preferredFlavours: ["Citrus", "Smoky"],
    intensity: "adventurous",
    intent: "party",
  });

  assert.ok(vector["cat:Soft Drinks"] > 0);
  assert.ok(vector["pref:alcohol-free"] > 0);
  assert.ok(vector["flavour:sour"] > 0);
  assert.ok(vector["mood:ADVENTUROUS"] > 0);
  assert.ok(vector["mood:ENERGETIC"] > 0);
  assert.ok(topTasteKeywords(vector).includes("alcohol-free options"));
});

test("legacy onboarding values remain meaningful", () => {
  const vector = profileTasteVector({
    preferredSpirits: ["whisky"],
    preferredFlavours: ["Smoky"],
    intensity: "couple",
    intent: "chill",
  });

  assert.ok(vector["cat:Whisky"] > 0);
  assert.ok(vector["flavour:smoky"] > 0);
  assert.ok(vector["mood:RELAXED"] > 0);
});
