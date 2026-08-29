import assert from "node:assert/strict";
import test from "node:test";
import { safeReturnTo } from "./safe-return-to";

test("safeReturnTo preserves same-site paths, queries, and fragments", () => {
  assert.equal(
    safeReturnTo("/cocktails/negroni?tab=notes&sort=top#comments"),
    "/cocktails/negroni?tab=notes&sort=top#comments",
  );
  assert.equal(safeReturnTo(["/parties/party_123", "/ignored"]), "/parties/party_123");
  assert.equal(
    safeReturnTo("/search?next=https%3A%2F%2Fexample.com"),
    "/search?next=https%3A%2F%2Fexample.com",
  );
});

test("safeReturnTo rejects absolute and protocol-relative URLs", () => {
  for (const value of [
    "https://example.com/steal",
    "http://example.com/steal",
    "javascript:alert(1)",
    "//example.com/steal",
    "///example.com/steal",
    "example.com/steal",
  ]) {
    assert.equal(safeReturnTo(value), "/", value);
  }
});

test("safeReturnTo rejects backslashes and control characters", () => {
  for (const value of [
    "/\\example.com",
    "/safe\\..\\login",
    "/%5cexample.com",
    "/line\nbreak",
    "/line\u0000break",
    "/%0d%0aLocation:example.com",
    "/%7fhidden",
  ]) {
    assert.equal(safeReturnTo(value), "/", JSON.stringify(value));
  }
});

test("safeReturnTo rejects login-loop destinations, including encoded forms", () => {
  for (const value of [
    "/login",
    "/login?returnTo=%2Fdrinks",
    "/login/otp",
    "/LOGIN",
    "/%6cogin",
    "/login%2Fotp",
  ]) {
    assert.equal(safeReturnTo(value), "/", value);
  }
});

test("safeReturnTo validates its fallback too", () => {
  assert.equal(safeReturnTo(null, "/party/SIPABC23"), "/party/SIPABC23");
  assert.equal(safeReturnTo("//bad.example", "https://also-bad.example"), "/");
});
