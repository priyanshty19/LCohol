"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// ── Shared row types (light shapes from getPartyDetail) ──────────────────────
type Suggester = { profile: { username: string | null; displayName: string | null } | null } | null;

type DrinkSuggestion = {
  id: string;
  suggestedById: string;
  suggestedBy: Suggester;
  drink: { id: string; name: string; slug: string; category: { name: string } | null } | null;
  cocktail: { id: string; name: string; slug: string; category: string | null } | null;
};

type GameSuggestion = {
  id: string;
  text: string;
  suggestedById: string;
  suggestedBy: Suggester;
  votes: { userId: string }[];
};

type CatalogResult = { kind: "drink" | "cocktail"; id: string; name: string; subtitle: string | null; slug: string | null };

function suggesterName(s: Suggester): string {
  return s?.profile?.displayName ?? s?.profile?.username ?? "someone";
}

// ── Suggest a cocktail / drink ───────────────────────────────────────────────
export function PartyDrinks({
  partyId,
  meId,
  isHost,
  initial,
}: {
  partyId: string;
  meId: string;
  isHost: boolean;
  initial: DrinkSuggestion[];
}) {
  const [list, setList] = useState<DrinkSuggestion[]>(initial);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      return;
    }
    let active = true;
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/catalog/search?q=${encodeURIComponent(term)}`);
        const j = await r.json();
        if (active) setResults(j.data?.results ?? []);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query]);

  function updateQuery(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setSearching(false);
    }
  }

  async function add(item: CatalogResult) {
    setQuery("");
    setResults([]);
    // Optimistic row
    const tmpId = `tmp-${item.kind}-${item.id}`;
    if (list.some((s) => (item.kind === "drink" ? s.drink?.id === item.id : s.cocktail?.id === item.id))) {
      return; // already suggested
    }
    const optimistic: DrinkSuggestion = {
      id: tmpId,
      suggestedById: meId,
      suggestedBy: { profile: { username: "you", displayName: "You" } },
      drink: item.kind === "drink" ? { id: item.id, name: item.name, slug: item.slug ?? "", category: null } : null,
      cocktail: item.kind === "cocktail" ? { id: item.id, name: item.name, slug: item.slug ?? "", category: null } : null,
    };
    setList((prev) => [optimistic, ...prev]);
    try {
      const r = await fetch(`/api/parties/${partyId}/drinks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: item.kind, id: item.id }),
      });
      const j = await r.json();
      if (r.ok && j.data?.id) {
        setList((prev) => prev.map((s) => (s.id === tmpId ? { ...s, id: j.data.id } : s)));
      } else {
        setList((prev) => prev.filter((s) => s.id !== tmpId));
      }
    } catch {
      setList((prev) => prev.filter((s) => s.id !== tmpId));
    }
  }

  async function remove(id: string) {
    const prev = list;
    setList((l) => l.filter((s) => s.id !== id));
    if (id.startsWith("tmp-")) return;
    const r = await fetch(`/api/parties/${partyId}/drinks`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestionId: id }),
    }).catch(() => null);
    if (!r || !r.ok) setList(prev);
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          🍸 What we&apos;re drinking
        </p>

        <div className="relative">
          <Input
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
            placeholder="Add a drink or cocktail…"
            className="sm:max-w-md"
          />
          {results.length > 0 && (
            <div className="absolute z-20 mt-1 w-full max-w-md overflow-hidden rounded-lg border border-border/60 bg-popover shadow-xl">
              {results.map((item) => (
                <button
                  key={`${item.kind}-${item.id}`}
                  type="button"
                  onClick={() => add(item)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50"
                >
                  <span className="truncate">{item.name}</span>
                  <Badge variant="outline" className="ml-2 shrink-0 text-[10px] capitalize">
                    {item.kind}
                  </Badge>
                </button>
              ))}
            </div>
          )}
          {searching && query.length >= 2 && results.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">Searching…</p>
          )}
          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">No match yet. Try the drink name or a close spelling.</p>
          )}
        </div>

        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">No drinks suggested yet. Add the first one.</p>
        ) : (
          <ul className="space-y-1.5">
            {list.map((s) => {
              const item = s.drink ?? s.cocktail;
              const kind = s.drink ? "drink" : "cocktail";
              const href = item?.slug ? `/${kind === "drink" ? "drinks" : "cocktails"}/${item.slug}` : null;
              const canRemove = s.suggestedById === meId || isHost;
              return (
                <li
                  key={s.id}
                  className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm"
                >
                  <span className="text-base">{kind === "cocktail" ? "🍸" : "🍾"}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {href ? (
                      <Link href={href} className="hover:text-primary hover:underline">
                        {item?.name}
                      </Link>
                    ) : (
                      item?.name
                    )}
                    <span className="ml-1 text-xs text-muted-foreground/60">· {suggesterName(s.suggestedBy)}</span>
                  </span>
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => remove(s.id)}
                      aria-label={`Remove ${item?.name}`}
                      className="shrink-0 rounded p-1 text-muted-foreground/50 transition hover:bg-destructive/10 hover:text-destructive"
                    >
                      ✕
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ── Suggest a game (persist + upvote) ────────────────────────────────────────
export function PartyGames({
  partyId,
  meId,
  isHost,
  initial,
}: {
  partyId: string;
  meId: string;
  isHost: boolean;
  initial: GameSuggestion[];
}) {
  const [list, setList] = useState<GameSuggestion[]>(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const sorted = useMemo(
    () => [...list].sort((a, b) => b.votes.length - a.votes.length),
    [list],
  );

  async function suggest() {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    const tmpId = `tmp-${t}`;
    const optimistic: GameSuggestion = {
      id: tmpId,
      text: t,
      suggestedById: meId,
      suggestedBy: { profile: { username: "you", displayName: "You" } },
      votes: [],
    };
    setList((prev) => [...prev, optimistic]);
    setText("");
    try {
      const r = await fetch(`/api/parties/${partyId}/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      const j = await r.json();
      if (r.ok && j.data?.id) {
        setList((prev) => prev.map((g) => (g.id === tmpId ? { ...g, id: j.data.id } : g)));
      } else {
        setList((prev) => prev.filter((g) => g.id !== tmpId));
      }
    } catch {
      setList((prev) => prev.filter((g) => g.id !== tmpId));
    } finally {
      setBusy(false);
    }
  }

  async function toggleVote(gameId: string) {
    if (gameId.startsWith("tmp-")) return;
    // Optimistic toggle
    setList((prev) =>
      prev.map((g) => {
        if (g.id !== gameId) return g;
        const has = g.votes.some((v) => v.userId === meId);
        return {
          ...g,
          votes: has ? g.votes.filter((v) => v.userId !== meId) : [...g.votes, { userId: meId }],
        };
      }),
    );
    await fetch(`/api/parties/${partyId}/games/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId }),
    }).catch(() => {});
  }

  async function remove(gameId: string) {
    const prev = list;
    setList((l) => l.filter((g) => g.id !== gameId));
    if (gameId.startsWith("tmp-")) return;
    const r = await fetch(`/api/parties/${partyId}/games`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId }),
    }).catch(() => null);
    if (!r || !r.ok) setList(prev);
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">🎲 Games</p>

        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") suggest();
            }}
            placeholder="Suggest a game — Most Likely To, Charades…"
            maxLength={200}
          />
          <Button variant="gold" size="sm" disabled={busy || !text.trim()} onClick={suggest}>
            Add
          </Button>
        </div>

        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No games yet. Suggest one to get the night going.</p>
        ) : (
          <ul className="space-y-1.5">
            {sorted.map((g) => {
              const voted = g.votes.some((v) => v.userId === meId);
              const canRemove = g.suggestedById === meId || isHost;
              return (
                <li
                  key={g.id}
                  className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm"
                >
                  <button
                    type="button"
                    onClick={() => toggleVote(g.id)}
                    aria-pressed={voted}
                    aria-label={voted ? "Remove vote" : "Upvote"}
                    className={
                      "flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs transition " +
                      (voted
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border/60 text-muted-foreground hover:text-foreground")
                    }
                  >
                    ▲ {g.votes.length}
                  </button>
                  <span className="min-w-0 flex-1 truncate">
                    {g.text}
                    <span className="ml-1 text-xs text-muted-foreground/60">· {suggesterName(g.suggestedBy)}</span>
                  </span>
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => remove(g.id)}
                      aria-label={`Remove ${g.text}`}
                      className="shrink-0 rounded p-1 text-muted-foreground/50 transition hover:bg-destructive/10 hover:text-destructive"
                    >
                      ✕
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
