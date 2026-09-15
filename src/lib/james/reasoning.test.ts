import { test } from "node:test";
import assert from "node:assert/strict";
import { stripReasoning } from "./reasoning.ts";

test("drops a complete think block and keeps the reply", () => {
  assert.equal(
    stripReasoning("<think>The guest wants a rainy night pick. Old Monk fits.</think>Old Monk, neat. 🥃"),
    "Old Monk, neat. 🥃"
  );
});

test("drops reasoning that never closed", () => {
  assert.equal(stripReasoning("<think>Let me weigh the options"), "");
});

test("drops reasoning that never opened", () => {
  assert.equal(stripReasoning("weighing options</think>Bira, cold. 🍺"), "Bira, cold. 🍺");
});

test("leaves a normal reply untouched", () => {
  assert.equal(stripReasoning("Old Monk, neat. 🥃"), "Old Monk, neat. 🥃");
});

test("keeps the %%ACTION%% directive intact for parseReply", () => {
  assert.equal(
    stripReasoning('<think>vibe change</think>Done. 🎉\n%%ACTION%% {"type":"set_vibe","theme":"neon"}'),
    'Done. 🎉\n%%ACTION%% {"type":"set_vibe","theme":"neon"}'
  );
});
