import assert from "node:assert/strict";
import test from "node:test";
import { barsRequest } from "./bars-query";

test("city tabs use the cached local directory", () => {
  const request = barsRequest({
    city: "Delhi NCR",
    type: "PUB",
    query: "rooftop",
    nearbyLocation: null,
  });

  assert.equal(request.endpoint, "/api/bars");
  assert.equal(request.params.get("city"), "Delhi NCR");
  assert.equal(request.params.get("type"), "PUB");
  assert.equal(request.params.get("q"), "rooftop");
});

test("near-me tabs send their selected category to Google Places", () => {
  const request = barsRequest({
    city: "Delhi NCR",
    type: "BREWERY",
    query: "malt",
    nearbyLocation: [28.61, 77.21],
  });

  assert.equal(request.endpoint, "/api/bars/nearby");
  assert.equal(request.params.get("lat"), "28.61");
  assert.equal(request.params.get("lng"), "77.21");
  assert.equal(request.params.get("type"), "BREWERY");
  assert.equal(request.params.has("q"), false);
});
