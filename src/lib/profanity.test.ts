import { test } from "node:test";
import assert from "node:assert/strict";
import { containsProfanity } from "./profanity.ts";

test("blocks blatant profanity and slurs", () => {
  for (const s of ["Fucker", "MotherFucker", "shit", "bitch", "cunt", "nigga"]) {
    assert.equal(containsProfanity(s), true, `should block: ${s}`);
  }
});

test("blocks common evasions (leetspeak, spacing, punctuation, repeats)", () => {
  for (const s of ["sh1t", "n1gga", "F.U.C.K", "f u c k e r", "f-u-c-k", "fuuuuck"]) {
    assert.equal(containsProfanity(s), true, `should block evasion: ${s}`);
  }
});

test("does NOT flag clean names (Scunthorpe-safe)", () => {
  for (const s of [
    "PB drink",
    "Classic Martini",
    "Cocktail",
    "assassin cola",
    "Scunthorpe Sour",
    "class act",
    "Gin & Tonic",
    "G I N Fizz",
    "Rum Run",
    "Mint Mojito",
    "Bellary Chilli Syrup",
    "A B C Punch",
  ]) {
    assert.equal(containsProfanity(s), false, `should allow: ${s}`);
  }
});

test("handles empty / null input", () => {
  assert.equal(containsProfanity(""), false);
  assert.equal(containsProfanity(null), false);
  assert.equal(containsProfanity(undefined), false);
});
