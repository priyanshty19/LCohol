import assert from "node:assert/strict";
import test from "node:test";
import {
  beginVoteRequest,
  finishVoteRequest,
  parseVoteResponse,
  type VoteState,
} from "./vote-state";

test("only one vote request can start before React renders the pending state", () => {
  const gate = { current: false };

  assert.equal(beginVoteRequest(gate), true);
  assert.equal(beginVoteRequest(gate), false);

  finishVoteRequest(gate);
  assert.equal(beginVoteRequest(gate), true);
});

test("the server response atomically replaces both score and selected arrow", () => {
  assert.deepEqual(parseVoteResponse({ score: 5, vote: 1 }), {
    score: 5,
    vote: 1,
  });
  assert.deepEqual(parseVoteResponse({ score: 3, vote: -1 }), {
    score: 3,
    vote: -1,
  });
  assert.deepEqual(parseVoteResponse({ score: 4, vote: null }), {
    score: 4,
    vote: null,
  });
});

test("malformed responses never make the visible vote state fluctuate", () => {
  const current: VoteState = { score: 8, vote: 1 };

  assert.equal(parseVoteResponse(null), null);
  assert.equal(parseVoteResponse({ score: 9, vote: 0 }), null);
  assert.equal(parseVoteResponse({ score: Number.NaN, vote: 1 }), null);

  // The component keeps `current` whenever parsing returns null.
  assert.deepEqual(parseVoteResponse(null) ?? current, current);
});
