import { test } from "node:test";
import assert from "node:assert/strict";
import { clientIp } from "./rate-limit";

const req = (headers: Record<string, string>) =>
  new Request("https://sipstories.test/api/posts", { headers });

test("prefers x-real-ip — Vercel sets it and overwrites client values", () => {
  assert.equal(clientIp(req({ "x-real-ip": "203.0.113.7" })), "203.0.113.7");
});

test("ignores a spoofed x-real-ip in favour of nothing else being trusted", () => {
  // The client controls the FIRST xff hop; the trusted proxy appends the last.
  const ip = clientIp(req({ "x-forwarded-for": "1.2.3.4, 203.0.113.7" }));
  assert.equal(ip, "203.0.113.7", "must take the last hop, not the client's");
});

test("unidentifiable callers no longer collapse into ONE shared bucket", () => {
  // Previously every such request keyed to the literal "unknown", so one noisy
  // client could exhaust that bucket and 429 every other unattributable caller.
  const a = clientIp(req({ "user-agent": "Mozilla/5.0 (iPhone)" }));
  const b = clientIp(req({ "user-agent": "Mozilla/5.0 (Android)" }));
  const c = clientIp(req({ "user-agent": "curl/8.4.0" }));
  assert.ok(a.startsWith("unknown-"), `got ${a}`);
  assert.ok(new Set([a, b, c]).size > 1, "different clients must not all share one key");
});

test("the unknown space stays bounded — it can't be used to escape limiting", () => {
  const keys = new Set<string>();
  for (let i = 0; i < 500; i++) {
    keys.add(clientIp(req({ "user-agent": `agent-${i}-${Math.random()}` })));
  }
  assert.ok(keys.size <= 16, `bucket count must be capped, got ${keys.size}`);
});

test("the same client is stable across requests", () => {
  const ua = "Mozilla/5.0 (Macintosh)";
  assert.equal(clientIp(req({ "user-agent": ua })), clientIp(req({ "user-agent": ua })));
});
