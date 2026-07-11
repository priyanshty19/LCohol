"use client";

import { useEffect, useState } from "react";

export type SipUser = {
  email: string;
  username: string | null;
  displayName: string | null;
  role: "USER" | "MODERATOR" | "ADMIN";
  isBanned: boolean;
  emergencyPhone: string | null;
};

// Module-level cache shared by every useAuth() consumer (header, profile,
// circle, …). Previously each mount hit /api/auth/me fresh, so one screen with N
// components = N identical requests, each grabbing a DB connection. Now the
// result is cached for TTL_MS and concurrent mounts share one in-flight promise.
const TTL_MS = 30_000;
let cache: { user: SipUser | null; at: number } | null = null;
let inflight: Promise<SipUser | null> | null = null;

async function fetchMe(): Promise<SipUser | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.user;
  if (inflight) return inflight; // a fetch is already in the air — ride it
  inflight = fetch("/api/auth/me")
    .then((r) => r.json())
    .then(({ user }) => {
      cache = { user: (user ?? null) as SipUser | null, at: Date.now() };
      return cache.user;
    })
    .catch(() => null) // network blip: don't poison the cache, just return null
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

// Clear the cache after a session change (login / signup / logout). Those flows
// soft-navigate (router.push), so the module cache would otherwise show the
// pre-change identity for up to TTL_MS. Call this right before the redirect.
export function bustAuthCache() {
  cache = null;
  inflight = null;
}

export function useAuth() {
  // IMPORTANT: always start null on the FIRST render — do NOT seed from the
  // module cache here. With React's concurrent hydration, the Header hydrates
  // first and its effect populates `cache` mid-hydration; a later component
  // reading a now-warm cache on its first render would then differ from the
  // server HTML (which had no user) → hydration mismatch (React #418), which
  // silently aborts hydration of that subtree (dead buttons, unmounted map on
  // Settings/Bars, etc.). Starting null keeps SSR and every client first render
  // in agreement. The cache still short-circuits the fetch below, so a warm
  // cache repaints on the very next tick (imperceptible).
  const [user, setUser] = useState<SipUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchMe()
      .then((u) => {
        if (alive) setUser(u);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { user, loading };
}
