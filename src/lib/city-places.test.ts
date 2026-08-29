import assert from "node:assert/strict";
import test from "node:test";
import {
  cityCategoryAsNearby,
  cityTextQuery,
  parseBarCity,
  parseCityCategory,
} from "./city-places";

test("city place search accepts only supported cities and categories", () => {
  assert.equal(parseBarCity("Delhi NCR"), "Delhi NCR");
  assert.equal(parseBarCity("Mumbai"), null);
  assert.equal(parseCityCategory("CLUB"), "CLUB");
  assert.equal(parseCityCategory("restaurant"), null);
});

test("city text queries carry the selected city, category, and search", () => {
  assert.equal(cityTextQuery("Pune", "BREWERY", ""), "breweries and brewpubs in Pune, India");
  assert.equal(
    cityTextQuery("Delhi NCR", "BYOB", "rooftop"),
    "rooftop BYOB restaurants and venues in Delhi NCR, India",
  );
});

test("BYOB remains a text-search category rather than an unsupported Nearby type", () => {
  assert.equal(cityCategoryAsNearby("BYOB"), null);
  assert.equal(cityCategoryAsNearby("LOUNGE"), "LOUNGE");
});
