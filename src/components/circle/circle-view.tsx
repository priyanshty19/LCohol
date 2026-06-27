"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Check, Copy, Link2, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type ReferralStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

type Referral = {
  id: string;
  code: string;
  label: string | null;
  status: ReferralStatus;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  acceptedBy: { profile: { username: string | null } | null } | null;
};

type Connection = {
  id: string;
  since: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

// Parse a response as JSON without throwing — an error route may return HTML
// (e.g. a 500 page), which would otherwise crash the component.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function safeJson(r: Response): Promise<any | null> {
  try {
    return await r.json();
  } catch {
    return null;
  }
}

const STATUS_STYLE: Record<ReferralStatus, string> = {
  PENDING: "border-primary/40 bg-primary/10 text-primary",
  ACCEPTED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
  EXPIRED: "border-border bg-muted/40 text-muted-foreground",
  REVOKED: "border-border bg-muted/40 text-muted-foreground",
};

type SearchResult = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  relationship: "connected" | "pending" | "none";
};

type RequestUser = { username: string | null; displayName: string | null; avatarUrl: string | null };
type Requests = {
  incoming: { id: string; createdAt: string; user: RequestUser }[];
  outgoing: { id: string; createdAt: string; user: RequestUser }[];
};

export function CircleView({ embedded = false }: { embedded?: boolean }) {
  const [tab, setTab] = useState<"invites" | "circle">("invites");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [maxActive, setMaxActive] = useState(5);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Find-people + connection-requests (for members already on the app)
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [requests, setRequests] = useState<Requests>({ incoming: [], outgoing: [] });

  // One fetch for all three sections (invites + connections + requests). The old
  // code fired 3 separate requests per refresh; /api/circle/summary bundles them
  // into a single DB round-trip — see that route for the rationale.
  const loadSummary = useCallback(async () => {
    const r = await fetch("/api/circle/summary");
    const d = await safeJson(r);
    if (r.ok && d) {
      setReferrals(d.data.referrals);
      setActiveCount(d.data.activeCount);
      setMaxActive(d.data.maxActive);
      setConnections(d.data.connections);
      setRequests(d.data.requests);
    } else {
      setError("Couldn't load your circle. Please try again.");
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  // Near-real-time: quietly re-sync every 30s while the tab is visible, and
  // immediately when the user returns to it — so new invites, requests and
  // connections appear without a manual reload. 30s (was 12s) since one tab
  // open all day shouldn't keep hammering the pool for low-churn data.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void loadSummary();
    }, 30000);
    const onFocus = () => {
      if (document.visibilityState === "visible") void loadSummary();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [loadSummary]);

  // Debounced people search (all state changes happen inside the timeout, not
  // synchronously in the effect body).
  useEffect(() => {
    const q = query.trim();
    const t = setTimeout(async () => {
      if (q.length < 2) {
        setResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      const r = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      const d = await safeJson(r);
      if (r.ok && d) setResults(d.data);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function sendRequest(username: string) {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/connections/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const d = await safeJson(r);
    if (!r.ok) setError(d?.error ?? "Couldn't send request.");
    else {
      setResults((rs) =>
        rs.map((x) => (x.username === username ? { ...x, relationship: "pending" } : x)),
      );
      await loadSummary();
    }
    setBusy(false);
  }

  async function respondRequest(id: string, action: "accept" | "decline") {
    setBusy(true);
    setError(null);
    await fetch(`/api/connections/requests/${id}/${action}`, { method: "POST" });
    await loadSummary();
    setBusy(false);
  }

  async function generate() {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label.trim() || undefined }),
    });
    const d = await safeJson(r);
    if (!r.ok) setError(d?.error ?? "Couldn't create an invite.");
    else setLabel("");
    await loadSummary();
    setBusy(false);
  }

  async function revoke(id: string) {
    setBusy(true);
    setError(null);
    await fetch(`/api/referrals/${id}/revoke`, { method: "POST" });
    await loadSummary();
    setBusy(false);
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 1500);
    } catch {
      /* clipboard may be blocked; ignore */
    }
  }

  const pending = referrals.filter((r) => r.status === "PENDING");
  const history = referrals.filter((r) => r.status !== "PENDING");
  const atLimit = activeCount >= maxActive;

  // Resolve a search result's status from the LIVE connections/requests (which
  // poll), so a result flips from "Pending" → "In your circle" the moment the
  // request is accepted — instead of showing the stale value from search time.
  function liveRel(u: SearchResult): "connected" | "pending" | "none" {
    if (connections.some((c) => c.username === u.username)) return "connected";
    if (
      requests.outgoing.some((r) => r.user.username === u.username) ||
      requests.incoming.some((r) => r.user.username === u.username)
    ) {
      return "pending";
    }
    return u.relationship === "connected" ? "connected" : u.relationship === "pending" ? "pending" : "none";
  }

  return (
    <div className="space-y-6">
      <div>
        {embedded ? (
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
            Your Circle
          </h2>
        ) : (
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Your Circle
          </h1>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          Invite people from your group. Whoever joins with your code becomes
          part of your closed-knit circle.
        </p>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-full border border-border/60 bg-card/60 p-1 text-sm">
        <button
          onClick={() => setTab("invites")}
          className={`rounded-full px-4 py-1.5 transition-colors ${
            tab === "invites"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Invites
        </button>
        <button
          onClick={() => setTab("circle")}
          className={`rounded-full px-4 py-1.5 transition-colors ${
            tab === "circle"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          My Circle ({connections.length})
          {requests.incoming.length > 0 && (
            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {requests.incoming.length}
            </span>
          )}
        </button>
      </div>

      {tab === "invites" ? (
        <div className="space-y-5">
          {/* Generate */}
          <Card variant="glass">
            <CardContent className="space-y-3 pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  Generate an invite
                </p>
                <span className="text-xs text-muted-foreground">
                  {activeCount}/{maxActive} active
                </span>
              </div>
              <div className="flex gap-2">
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value.slice(0, 50))}
                  placeholder="Label (optional) — e.g. for Rahul"
                  disabled={busy || atLimit}
                />
                <Button
                  variant="gold"
                  onClick={generate}
                  disabled={busy || atLimit}
                >
                  Generate
                </Button>
              </div>
              {atLimit && (
                <p className="text-xs text-muted-foreground">
                  You&apos;ve used all {maxActive} slots. Revoke one or let an
                  invite expire (3 days) to make a new one.
                </p>
              )}
              {error && <p className="text-xs text-[var(--ml-sos)]">{error}</p>}
            </CardContent>
          </Card>

          {/* Active invites */}
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active invites yet. Generate one above to add a friend.
            </p>
          ) : (
            <div className="space-y-3">
              {pending.map((r) => (
                <Card key={r.id} variant="glass">
                  <CardContent className="flex items-center justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="rounded-md bg-muted/50 px-2 py-1 font-mono text-sm text-foreground">
                          {r.code}
                        </code>
                        <button
                          onClick={() => copy(r.code)}
                          className="text-muted-foreground transition-colors hover:text-foreground"
                          aria-label="Copy code"
                        >
                          {copied === r.code ? (
                            <Check className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {r.label ? `${r.label} · ` : ""}expires{" "}
                        {formatDistanceToNow(new Date(r.expiresAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => revoke(r.id)}
                      disabled={busy}
                    >
                      Revoke
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                History
              </p>
              {history.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <code className="font-mono text-xs">{r.code}</code>
                    {r.label && <span className="truncate">· {r.label}</span>}
                    {r.status === "ACCEPTED" && r.acceptedBy?.profile?.username && (
                      <span>· {r.acceptedBy.profile.username}</span>
                    )}
                  </span>
                  <Badge
                    className={`border ${STATUS_STYLE[r.status]}`}
                    variant="outline"
                  >
                    {r.status.toLowerCase()}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {error && <p className="text-xs text-[var(--ml-sos)]">{error}</p>}

          {/* Find a member already on the app and request to connect */}
          <Card variant="glass">
            <CardContent className="space-y-3 pt-6">
              <p className="text-sm font-medium text-foreground">
                Add someone already on SipStories
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name…"
                  className="pl-9"
                />
              </div>
              {query.trim().length >= 2 && (
                <div className="space-y-2">
                  {searching && (
                    <p className="text-xs text-muted-foreground">Searching…</p>
                  )}
                  {!searching && results.length === 0 && (
                    <p className="text-xs text-muted-foreground">No members found.</p>
                  )}
                  {results.map((u) => {
                    const status = liveRel(u);
                    return (
                      <div
                        key={u.username}
                        className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/20 text-xs text-primary">
                            {(u.displayName ?? u.username)[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-foreground">
                            {u.displayName ?? u.username}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            @{u.username}
                          </p>
                        </div>
                        {status === "connected" ? (
                          <span className="text-xs text-emerald-600">
                            In your circle ✓
                          </span>
                        ) : status === "pending" ? (
                          <span className="text-xs text-muted-foreground">
                            Pending
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => sendRequest(u.username)}
                          >
                            Add
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Incoming requests */}
          {requests.incoming.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Requests
              </p>
              {requests.incoming.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/20 text-xs text-primary">
                      {(req.user.displayName ?? req.user.username ?? "?")[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      {req.user.displayName ?? req.user.username}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      wants to join your circle
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="gold"
                    disabled={busy}
                    onClick={() => respondRequest(req.id, "accept")}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => respondRequest(req.id, "decline")}
                  >
                    Decline
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Outgoing pending */}
          {requests.outgoing.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Sent
              </p>
              {requests.outgoing.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/40 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    @{req.user.username} · pending
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => respondRequest(req.id, "decline")}
                  >
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Connections */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              In your circle
            </p>
            {connections.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                <Users className="h-8 w-8 opacity-60" />
                <p className="text-sm">
                  No one yet. Invite a friend with a code, or add someone above.
                </p>
              </div>
            ) : (
              connections.map((c) => (
                <Link
                  key={c.id}
                  href={`/profile/${c.username ?? ""}`}
                  prefetch={false}
                  className="flex items-center gap-3 rounded-xl border border-border/40 px-4 py-3 transition-colors hover:border-primary/40"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/20 text-xs text-primary">
                      {(c.displayName ?? c.username ?? "?")[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {c.displayName ?? c.username ?? "Someone"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{c.username ?? "unknown"} · in your circle{" "}
                      {formatDistanceToNow(new Date(c.since), { addSuffix: true })}
                    </p>
                  </div>
                  <Link2 className="ml-auto h-4 w-4 text-muted-foreground" />
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
