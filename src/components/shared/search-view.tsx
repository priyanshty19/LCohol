"use client";

import { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { PostCard } from "@/components/feed/post-card";
import { DrinkCard } from "@/components/drinks/drink-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";

type SearchType = "all" | "posts" | "drinks" | "users";

const SEARCH_TABS: { value: SearchType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "posts", label: "Stories" },
  { value: "drinks", label: "Drinks" },
  { value: "users", label: "People" },
];

// On a phone the bottom nav only holds the five core modules, so Search doubles
// as the discovery hub: these tiles are the way in to Bars/Cocktails/Drinks.
const BROWSE: { href: string; label: string; emoji: string; sub: string }[] = [
  { href: "/bars", label: "Bars & Cocktails", emoji: "🍸", sub: "Where to go · what to order" },
  { href: "/drinks", label: "Drinks", emoji: "🍷", sub: "Spirits, beers & wines" },
  { href: "/parties", label: "Parties", emoji: "🎉", sub: "Plan the night" },
  { href: "/mix", label: "Mix Lab", emoji: "🧪", sub: "Build your own" },
  // Safety surface — keep it one tap from the always-reachable Search hub, not
  // buried in the avatar menu (it's the page you want when you're least sober).
  { href: "/help", label: "Help & Safety", emoji: "🆘", sub: "Sober up · get home safe" },
];

export function SearchView() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType>("all");
  const [results, setResults] = useState<{
    posts?: any[];
    drinks?: any[];
    profiles?: any[];
  }>({});
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(
    async (q: string, t: SearchType) => {
      if (q.length < 2) {
        setResults({});
        setSearched(false);
        return;
      }

      setLoading(true);
      setSearched(true);

      try {
        const params = new URLSearchParams({ q, type: t });
        const res = await fetch(`/api/search?${params}`);
        const data = await res.json();
        setResults(data);
      } catch {
        console.error("Search failed");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Live search: debounce keystrokes so we hit the API once the user pauses,
  // not on every character. Enter still triggers an immediate search.
  useEffect(() => {
    const t = setTimeout(() => search(query, type), 300);
    return () => clearTimeout(t);
  }, [query, type, search]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      search(query, type);
    }
  }

  function handleTypeChange(newType: string) {
    // The debounced effect re-runs on `type` change and refreshes results.
    setType(newType as SearchType);
  }

  const hasPosts = (results.posts?.length ?? 0) > 0;
  const hasDrinks = (results.drinks?.length ?? 0) > 0;
  const hasProfiles = (results.profiles?.length ?? 0) > 0;
  const hasAnyResults = hasPosts || hasDrinks || hasProfiles;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Input
          variant="search"
          placeholder="Search stories, drinks, people..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-12 text-base search-glow"
          autoFocus
        />
        <div className="flex flex-wrap gap-2">
          {SEARCH_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleTypeChange(tab.value)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                type === tab.value ? "pill-active" : "pill-inactive hover:text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Discovery hub — shown until the user actually searches. Keeps the
          browse surfaces one tap away on phones, where they left the nav bar. */}
      {!searched && !loading && (
        <div className="space-y-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Browse
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {BROWSE.map((b) => (
              <Link
                key={b.href}
                href={b.href}
                className="glass-panel flex min-h-11 flex-col gap-1 rounded-xl p-4 transition-all hover:border-primary/40 hover:glow-primary"
              >
                <span className="text-2xl" aria-hidden>
                  {b.emoji}
                </span>
                <span className="font-display font-semibold text-foreground">
                  {b.label}
                </span>
                <span className="text-xs text-muted-foreground">{b.sub}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      )}

      {!loading && searched && !hasAnyResults && (
        <div className="py-16 text-center">
          <p className="font-display text-lg font-medium text-foreground">No results found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different search term
          </p>
        </div>
      )}

      {!loading && hasPosts && (
        <div className="space-y-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Stories ({results.posts!.length})
          </h2>
          {results.posts!.map((post: any) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {!loading && hasDrinks && (
        <div className="space-y-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Drinks ({results.drinks!.length})
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {results.drinks!.map((drink: any) => (
              <DrinkCard key={drink.id} drink={drink} />
            ))}
          </div>
        </div>
      )}

      {!loading && hasProfiles && (
        <div className="space-y-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            People ({results.profiles!.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {results.profiles!.map((profile: any) => (
              <Link
                key={profile.username}
                href={`/profile/${profile.username}`}
                className="glass-panel flex min-h-11 items-center gap-3 rounded-xl p-4 transition-all hover:border-primary/40 hover:glow-primary"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {profile.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">
                    {profile.displayName ?? profile.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{profile.username} · {profile.shots ?? 0} Shots 🥃
                  </p>
                  {profile.bio && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
