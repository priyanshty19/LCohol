import assert from "node:assert/strict";
import test from "node:test";
import { activeEmailOtpSession, requestEmailOtp, type EmailOtpClerk } from "./clerk-email-otp";

function fixture() {
  const calls: string[] = [];
  const signIn = {
    status: "needs_identifier",
    identifier: "",
    supportedFirstFactors: [{ strategy: "email_code", emailAddressId: "email-id" }],
    async create({ identifier }: { identifier: string }) {
      calls.push("signin.create");
      this.identifier = identifier;
      this.status = "needs_first_factor";
      return this;
    },
    async prepareFirstFactor(params: { strategy: string; emailAddressId: string }) {
      assert.equal(params.emailAddressId, "email-id");
      calls.push("signin.send");
    },
  };
  const signUp = {
    status: "",
    emailAddress: "",
    async create({ emailAddress }: { emailAddress: string }) {
      calls.push("signup.create");
      this.emailAddress = emailAddress;
      this.status = "missing_requirements";
      return this;
    },
    async prepareEmailAddressVerification() { calls.push("signup.send"); },
  };
  const state = {
    session: null as null | { id: string; user: { primaryEmailAddress: { emailAddress: string; verification: { status: string } } } },
    client: { signIn, signUp },
    async signOut() { calls.push("signout"); this.session = null; },
  };
  return { state, clerk: state as unknown as EmailOtpClerk, signIn, signUp, calls };
}

test("resend clears a stranded verified session before starting a new attempt", async () => {
  const f = fixture();
  f.state.session = { id: "session", user: { primaryEmailAddress: { emailAddress: "member@example.com", verification: { status: "verified" } } } };
  assert.equal(await requestEmailOtp(f.clerk, "member@example.com", "signin"), "signin");
  assert.deepEqual(f.calls, ["signout", "signin.create", "signin.send"]);
});

test("resend reuses a live sign-in attempt without recreating it", async () => {
  const f = fixture();
  f.signIn.status = "needs_first_factor";
  f.signIn.identifier = "member@example.com";
  await requestEmailOtp(f.clerk, "member@example.com", "signin");
  assert.deepEqual(f.calls, ["signin.send"]);
});

test("only an unknown Clerk identifier triggers legacy-member signup verification", async () => {
  const f = fixture();
  f.signIn.create = async () => { throw { errors: [{ code: "form_identifier_not_found" }] }; };
  assert.equal(await requestEmailOtp(f.clerk, "member@example.com", "signin"), "signup");
  assert.deepEqual(f.calls, ["signup.create", "signup.send"]);
});

test("a completed shadow signup can request a sign-in code for membership recovery", async () => {
  const f = fixture();
  f.signUp.create = async () => { throw { errors: [{ code: "form_identifier_exists" }] }; };
  assert.equal(await requestEmailOtp(f.clerk, "member@example.com", "signup"), "signin");
  assert.deepEqual(f.calls, ["signin.create", "signin.send"]);
});

test("a lost signup attempt is recreated, while a live one can resend directly", async () => {
  const f = fixture();
  await requestEmailOtp(f.clerk, "member@example.com", "signup");
  await requestEmailOtp(f.clerk, "member@example.com", "signup");
  assert.deepEqual(f.calls, ["signup.create", "signup.send", "signup.send"]);
});

test("an expired signup resource is replaced before resending", async () => {
  const f = fixture();
  f.signUp.status = "missing_requirements";
  f.signUp.emailAddress = "member@example.com";
  let attempts = 0;
  f.signUp.prepareEmailAddressVerification = async () => {
    if (++attempts === 1) throw { errors: [{ code: "resource_not_found" }] };
    f.calls.push("signup.send");
  };
  await requestEmailOtp(f.clerk, "member@example.com", "signup");
  assert.deepEqual(f.calls, ["signup.create", "signup.send"]);
});

test("delivery errors never fall through to a different authentication flow", async () => {
  for (const code of ["too_many_requests", "captcha_invalid", "network_error"]) {
    const f = fixture();
    f.signIn.prepareFirstFactor = async () => { throw { errors: [{ code }] }; };
    await assert.rejects(requestEmailOtp(f.clerk, "member@example.com", "signin"));
    assert.deepEqual(f.calls, ["signin.create"]);
  }
});

test("verified session recovery requires the same canonical email", () => {
  const f = fixture();
  f.state.session = { id: "session", user: { primaryEmailAddress: { emailAddress: "m.em.ber+tag@gmail.com", verification: { status: "verified" } } } };
  assert.equal(activeEmailOtpSession(f.clerk, "member@gmail.com"), f.state.session);
  assert.equal(activeEmailOtpSession(f.clerk, "other@example.com"), null);
  f.state.session.user.primaryEmailAddress.verification.status = "unverified";
  assert.equal(activeEmailOtpSession(f.clerk, "member@gmail.com"), null);
});
