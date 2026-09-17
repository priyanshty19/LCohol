import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeToolCalls, wantsDrinkCards } from "./tools.ts";
import { THEMES } from "../theme.ts";

const aTheme = THEMES[0].id;

test("a valid set_vibe call becomes a set_vibe action with a label", () => {
  const { actions, cardQuery, rejected } = normalizeToolCalls([
    { name: "set_vibe", args: { theme: aTheme } },
  ]);
  assert.equal(actions.length, 1);
  assert.deepEqual({ type: actions[0].type, theme: (actions[0] as { theme: string }).theme }, { type: "set_vibe", theme: aTheme });
  assert.ok((actions[0] as { label: string }).label);
  assert.equal(cardQuery, null);
  assert.deepEqual(rejected, []);
});

test("a vibe change and a drinks ask survive together (the old else-if dropped one)", () => {
  const { actions, cardQuery } = normalizeToolCalls([
    { name: "set_vibe", args: { theme: aTheme } },
    { name: "find_drinks", args: { query: "gin" } },
  ]);
  assert.equal(actions.length, 1);
  assert.equal(cardQuery, "gin");
});

test("open_page resolves to a real path", () => {
  const { actions } = normalizeToolCalls([{ name: "open_page", args: { page: "hangover" } }]);
  assert.deepEqual(actions, [{ type: "navigate", path: "/hangover", label: "Hangover SOS" }]);
});

test("garbage args are rejected, not turned into actions", () => {
  const { actions, cardQuery, rejected } = normalizeToolCalls([
    { name: "set_vibe", args: { theme: "not-a-theme" } },
    { name: "open_page", args: {} },
    { name: "find_drinks", args: { query: "" } },
    { name: "teleport", args: {} },
  ]);
  assert.deepEqual(actions, []);
  assert.equal(cardQuery, null);
  assert.equal(rejected.length, 4);
});

test("no tool calls yields nothing at all", () => {
  assert.deepEqual(normalizeToolCalls(undefined), { actions: [], cardQuery: null, rejected: [] });
});

test("only the first navigation is kept", () => {
  const { actions } = normalizeToolCalls([
    { name: "open_page", args: { page: "bars" } },
    { name: "open_page", args: { page: "help" } },
  ]);
  assert.equal(actions.length, 1);
  assert.equal((actions[0] as { path: string }).path, "/bars");
});

test("negation in one clause no longer kills the ask in another", () => {
  assert.equal(wantsDrinkCards("I don't want whisky, show me gin"), true);
  assert.equal(wantsDrinkCards("what should i drink tonight"), true);
  assert.equal(wantsDrinkCards("don't show me drinks"), false);
  assert.equal(wantsDrinkCards("just tell me about hangovers"), false);
});
