export type VoteState = { score: number; vote: 1 | -1 | null };

type RequestGate = { current: boolean };

/**
 * React state updates are scheduled, so two events in the same browser tick can
 * both observe `pending === false`. This synchronous gate guarantees that one
 * physical action can never produce two toggle requests.
 */
export function beginVoteRequest(gate: RequestGate): boolean {
  if (gate.current) return false;
  gate.current = true;
  return true;
}

export function finishVoteRequest(gate: RequestGate) {
  gate.current = false;
}

/** Accept only the API's complete, authoritative score + selection pair. */
export function parseVoteResponse(value: unknown): VoteState | null {
  if (!value || typeof value !== "object") return null;
  const { score, vote } = value as { score?: unknown; vote?: unknown };
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  if (vote !== 1 && vote !== -1 && vote !== null) return null;
  return { score, vote };
}
