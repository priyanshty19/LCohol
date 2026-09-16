import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";

function verifier(tokenFailure?: unknown, userFailure?: unknown) {
  const exports: {
    verifiedEmailFromClerkToken?: (token: string) => Promise<{ email: string; sessionId?: string } | null>;
    ClerkVerificationUnavailableError?: new () => Error;
  } = {};
  const sdk = {
    verifyToken: async () => {
      if (tokenFailure) throw tokenFailure;
      return { sub: "user", sid: "session" };
    },
    createClerkClient: () => ({ users: { getUser: async () => {
      if (userFailure) throw userFailure;
      return { primaryEmailAddressId: "email", emailAddresses: [{ id: "email", emailAddress: "Member@example.com", verification: { status: "verified" } }] };
    } } }),
  };
  const code = transpileModule(readFileSync(new URL("./clerk.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(code, { exports, require: () => sdk, process: { env: { CLERK_SECRET_KEY: "test" } }, console: { error: () => {} } });
  return { verify: exports.verifiedEmailFromClerkToken!, Unavailable: exports.ClerkVerificationUnavailableError! };
}

test("valid tokens resolve only the verified primary email", async () => {
  const result = await verifier().verify("test-token");
  assert.equal(result?.email, "member@example.com");
  assert.equal(result?.sessionId, "session");
});

test("invalid and expired tokens remain authentication failures", async () => {
  for (const reason of ["token-expired", "token-invalid-signature", "token-invalid"]) {
    assert.equal(await verifier({ reason }).verify("test-token"), null);
  }
  assert.equal(await verifier(undefined, { status: 404 }).verify("test-token"), null);
});

test("key-fetch and user-lookup outages are retryable service errors", async () => {
  for (const v of [verifier({ reason: "jwk-remote-failed-to-load" }), verifier(undefined, { code: "api_response_error" })]) {
    await assert.rejects(v.verify("test-token"), (error: unknown) => error instanceof v.Unavailable);
  }
});
