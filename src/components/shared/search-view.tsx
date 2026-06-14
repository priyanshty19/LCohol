"use client";

import { useState, useCallback } from "react";
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      search(query, type);
    }
  }

  function handleTypeChange(newType: string) {
    setType(newType as SearchType);
    if (query.length >= 2) {
      search(query, newType as SearchType);
    }
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
              className={type === tab.value ? "pill-active" : "pill-inactive"}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

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
