import assert from "node:assert/strict";
import test from "node:test";
import {
  categoryForGooglePlace,
  filterNearbyBars,
  googleTypesForCategory,
  parseNearbyCategory,
  placeMatchesGoogleCategory,
  toOperationalNearbyBars,
} from "./nearby-places";

test("nearby categories map to Google Places types", () => {
  assert.deepEqual(googleTypesForCategory("BREWERY"), ["brewery", "brewpub", "beer_garden"]);
  assert.deepEqual(googleTypesForCategory("CLUB"), ["night_club"]);
  assert.equal(parseNearbyCategory("BYOB"), null);
  assert.equal(parseNearbyCategory("BAR"), "BAR");
});

test("Google place types are converted to stable Sip Stories categories", () => {
  assert.equal(categoryForGooglePlace({ primaryType: "brewpub" }), "PUB");
  assert.equal(categoryForGooglePlace({ types: ["bar", "night_club"] }), "CLUB");
  assert.equal(categoryForGooglePlace({ primaryType: "lounge_bar" }), "LOUNGE");
});

test("selected venue tabs keep only matching Google place types", () => {
  const brewpub = { primaryType: "brewpub", types: ["bar"] };
  assert.equal(placeMatchesGoogleCategory(brewpub, "PUB"), true);
  assert.equal(placeMatchesGoogleCategory(brewpub, "BREWERY"), true);
  assert.equal(placeMatchesGoogleCategory(brewpub, "CLUB"), false);

  const places = toOperationalNearbyBars([
    {
      id: "pub",
      displayName: { text: "Real Pub" },
      businessStatus: "OPERATIONAL",
      primaryType: "irish_pub",
      location: { latitude: 28.6, longitude: 77.2 },
    },
    {
      id: "bar",
      displayName: { text: "Cocktail Bar" },
      businessStatus: "OPERATIONAL",
      primaryType: "cocktail_bar",
      location: { latitude: 28.61, longitude: 77.21 },
    },
  ], "PUB");
  assert.deepEqual(places.map((place) => place.id), ["pub"]);
  assert.equal(places[0]?.type, "PUB");
});

test("closed, future, unknown, and locationless places are excluded", () => {
  const bars = toOperationalNearbyBars([
    {
      id: "open",
      displayName: { text: "Open Bar" },
      businessStatus: "OPERATIONAL",
      primaryType: "cocktail_bar",
      location: { latitude: 28.6, longitude: 77.2 },
    },
    {
      id: "closed",
      businessStatus: "CLOSED_PERMANENTLY",
      location: { latitude: 28.61, longitude: 77.21 },
    },
    {
      id: "future",
      businessStatus: "FUTURE_OPENING",
      location: { latitude: 28.62, longitude: 77.22 },
    },
    {
      id: "unknown",
      location: { latitude: 28.63, longitude: 77.23 },
    },
    { id: "no-location", businessStatus: "OPERATIONAL" },
  ]);

  assert.deepEqual(bars.map((bar) => bar.id), ["open"]);
  assert.equal(bars[0]?.type, "BAR");
});

test("nearby text search filters by name, area, and category", () => {
  const bars = [
    { name: "Juniper Room", address: "Connaught Place", type: "BAR" },
    { name: "Malt House", address: "Hauz Khas", type: "BREWERY" },
  ];

  assert.deepEqual(filterNearbyBars(bars, "juniper"), [bars[0]]);
  assert.deepEqual(filterNearbyBars(bars, "hauz"), [bars[1]]);
  assert.deepEqual(filterNearbyBars(bars, "brewery"), [bars[1]]);
  assert.equal(filterNearbyBars(bars, "missing").length, 0);
});
