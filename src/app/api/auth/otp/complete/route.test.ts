import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { NextRequest, NextResponse } from "next/server";
import { ModuleKind, transpileModule } from "typescript";
import { canonicalizeEmail } from "../../../../../lib/email-normalize";

// Execute the real handler with isolated Clerk/DB dependencies; no live accounts.
function handler(existing: boolean) {
  let minted = 0;
  let created = 0;
  const modules: Record<string, unknown> = {
    "next/server": { NextResponse },
    "@/lib/prisma": {
      prisma: {
        user: {
          findFirst: async () => existing
            ? { id: "member", role: "USER", tokenEpoch: 3, profile: { username: "Member" } }
            : null,
        },
        profile: { findFirst: async () => null },
        $transaction: async (callback: (tx: unknown) => Promise<void>) => callback({
          user: { create: async () => { created++; return { id: "new-member" }; } },
        }),
      },
    },
    "@/lib/referral": { isTestReferralCode: () => true },
    "@/lib/referrals": { generateUniqueReferralCode: async () => "NEWCODE" },
    "@/lib/connections": {},
    "@/lib/rbac": { isAdminEmail: () => false },
    "@/lib/rate-limit": { rateLimitStrict: async () => true, clientIp: () => "test" },
    "@/lib/db-errors": { isPoolExhausted: () => false },
    "@/lib/clerk": {
      verifiedEmailFromClerkToken: async () => ({ email: "m.em.ber+test@gmail.com", sessionId: "verified" }),
      clerkBackend: { sessions: { revokeSession: async () => {} } },
    },
    "@/lib/email-normalize": { canonicalizeEmail },
    "@/lib/session": {
      createSessionToken: async () => { minted++; return "test-session"; },
      SESSION_COOKIE: "ss_auth",
      sessionCookieOptions: () => ({ httpOnly: true, path: "/" }),
    },
  };
  const exports: { POST?: (request: NextRequest) => Promise<Response> } = {};
  const code = transpileModule(readFileSync(new URL("./route.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ModuleKind.CommonJS },
  }).outputText;
  runInNewContext(code, {
    exports,
    require: (name: string) => {
      assert.ok(name in modules, `Unexpected dependency: ${name}`);
      return modules[name];
    },
    console,
  });
  return {
    post: (mode: string) => exports.POST!(new NextRequest("https://sipstories.test/api/auth/otp/complete", {
      method: "POST",
      body: JSON.stringify({
        mode, clerkToken: "verified-token", email: "ignored@example.com",
        username: "NewMember", dob: "1990-01-01", referralCode: "IEEE23", consent: true,
      }),
    })),
    counts: () => ({ minted, created }),
  };
}

test("signup for an existing member rejects completion without a login cookie", async () => {
  const route = handler(true);
  const response = await route.post("signup");
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, "ACCOUNT_EXISTS");
  assert.equal(response.headers.get("set-cookie"), null);
  assert.deepEqual(route.counts(), { minted: 0, created: 0 });
});

test("existing members can still sign in with a verified email", async () => {
  const route = handler(true);
  const response = await route.post("signin");
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.email, "member@gmail.com");
  assert.match(response.headers.get("set-cookie") ?? "", /^ss_auth=test-session;/);
  assert.deepEqual(route.counts(), { minted: 1, created: 0 });
});

test("a verified Clerk identity without a member can finish signup", async () => {
  const route = handler(false);
  const response = await route.post("signup");
  assert.equal(response.status, 201);
  assert.match(response.headers.get("set-cookie") ?? "", /^ss_auth=test-session;/);
  assert.deepEqual(route.counts(), { minted: 1, created: 1 });
});
