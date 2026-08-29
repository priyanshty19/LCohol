import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { updateSession } from "./middleware";

test("unauthenticated root serves the public landing without redirecting", async () => {
  const response = await updateSession(new NextRequest("https://sipstories.test/"));

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("x-middleware-rewrite"),
    "https://sipstories.test/login",
  );
});

test("social preview artwork is public to unauthenticated crawlers", async () => {
  const response = await updateSession(
    new NextRequest("https://sipstories.test/opengraph-image"),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
});

test("unauthenticated redirects preserve the protected pathname and search", async () => {
  const request = new NextRequest(
    "https://sipstories.test/cocktails/negroni?tab=notes&tag=citrus&tag=bitter",
  );

  const response = await updateSession(request);
  const location = response.headers.get("location");

  assert.equal(response.status, 307);
  assert.ok(location);
  const login = new URL(location);
  assert.equal(login.pathname, "/login");
  assert.equal(
    login.searchParams.get("returnTo"),
    "/cocktails/negroni?tab=notes&tag=citrus&tag=bitter",
  );
});

test("unauthenticated redirects preserve a pathname without adding a question mark", async () => {
  const response = await updateSession(
    new NextRequest("https://sipstories.test/create"),
  );
  const location = response.headers.get("location");

  assert.ok(location);
  assert.equal(new URL(location).searchParams.get("returnTo"), "/create");
});
