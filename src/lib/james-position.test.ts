import assert from "node:assert/strict";
import test from "node:test";
import { clampJamesPosition } from "./james-position";

test("James stays fully inside the visible screen", () => {
  assert.deepEqual(clampJamesPosition({ x: -40, y: 900 }, 390, 844, 64), { x: 8, y: 772 });
  assert.deepEqual(clampJamesPosition({ x: 120, y: 240 }, 390, 844, 64), { x: 120, y: 240 });
});
