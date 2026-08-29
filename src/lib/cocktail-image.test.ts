import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeCocktailImageUrl } from "./cocktail-image";

const storage = "https://example.supabase.co";
const owner = "11111111-1111-1111-1111-111111111111";

test("cocktail images accept this owner's Mix Lab uploads", () => {
  const image = `${storage}/storage/v1/object/public/post-images/${owner}/mixes/photo.jpg`;
  assert.equal(sanitizeCocktailImageUrl(image, owner, storage), image);
});

test("cocktail images reject other hosts, folders, and owners", () => {
  assert.equal(sanitizeCocktailImageUrl("https://evil.example/photo.jpg", owner, storage), null);
  assert.equal(
    sanitizeCocktailImageUrl(`${storage}/storage/v1/object/public/post-images/${owner}/posts/photo.jpg`, owner, storage),
    null,
  );
  assert.equal(
    sanitizeCocktailImageUrl(`${storage}/storage/v1/object/public/post-images/other/mixes/photo.jpg`, owner, storage),
    null,
  );
});
