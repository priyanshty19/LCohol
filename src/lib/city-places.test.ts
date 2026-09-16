import assert from "node:assert/strict";
import test from "node:test";
import {
  cityCategoryAsNearby,
  cityPlacePriceRange,
  cityTextQuery,
  dedupeCityPlaces,
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

test("live city places drop venues the directory already lists", () => {
  const local = [{ name: "The Brew & Co.", lat: 28.63, lng: 77.22 }];
  const external = [
    { name: "the brew and co", lat: 28.6301, lng: 77.2201 },
    { name: "The Brew & Co., Connaught Place", lat: 28.6302, lng: 77.2202 },
    { name: "Some Other Taproom", lat: 28.64, lng: 77.23 },
    { name: "  ", lat: 28.64, lng: 77.23 },
  ];

  assert.deepEqual(
    dedupeCityPlaces(local, external).map((p) => p.name),
    ["Some Other Taproom"],
  );
});

test("a same-named venue far away is kept as a separate result", () => {
  const local = [{ name: "Taproom", lat: 28.63, lng: 77.22 }];
  const external = [{ name: "Taproom Central", lat: 28.7, lng: 77.3 }];

  assert.equal(dedupeCityPlaces(local, external).length, 1);
});

test("Google price levels map onto our price ranges", () => {
  assert.equal(cityPlacePriceRange("PRICE_LEVEL_MODERATE"), "MID_RANGE");
  assert.equal(cityPlacePriceRange("PRICE_LEVEL_UNSPECIFIED"), null);
  assert.equal(cityPlacePriceRange(undefined), null);
});
