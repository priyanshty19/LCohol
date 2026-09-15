import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const viewSource = readFileSync(new URL("./bars-view.tsx", import.meta.url), "utf8");
const pageSource = readFileSync(
  new URL("../../app/(main)/bars/page.tsx", import.meta.url),
  "utf8",
);

test("city tabs use the cached directory while near-me retains Google Places", () => {
  assert.match(viewSource, /barsRequest/);
  assert.match(viewSource, /const requestQuery = nearby \? "" : q/);
  assert.doesNotMatch(pageSource, /getBars/);
  assert.doesNotMatch(pageSource, /initialBars/);
});
