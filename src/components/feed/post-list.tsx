"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Wine } from "lucide-react";
import { PostCard } from "./post-card";
import { Reveal } from "@/components/fx/motion";
import { Button, buttonVariants } from "@/components/ui/button";
import type { PostWithRelations, FeedSortOption } from "@/types/database";

interface PostListProps {
  sort: FeedSortOption;
  postType?: string;
  initialPosts?: PostWithRelations[];
  initialHasMore?: boolean;
  initialCursor?: string;
}

type FeedPage = { data: PostWithRelations[]; hasMore: boolean; nextCursor?: string };

// Module-level cache for the FIRST page of each sort/postType combo — mirrors
// the pattern in use-auth.ts. Without this, switching tabs (which remounts
// PostList with a different `sort`) always re-fetches from scratch even if the
// same tab was open seconds ago; every server-side Redis cache hit still pays a
// full network round trip. "Load more" pages are never cached (always fresh).
const FEED_TTL_MS = 20_000;
const feedCache = new Map<string, { page: FeedPage; at: number }>();
const feedInflight = new Map<string, Promise<FeedPage>>();

/** Drop all cached first pages — call after any action that changes what the
 * viewer should see (e.g. voting), so a tab switch can't resurrect stale state. */
export function bustFeedCache() {
  feedCache.clear();
}

async function fetchFeedPage(key: string, params: URLSearchParams): Promise<FeedPage> {
  const cached = feedCache.get(key);
  if (cached && Date.now() - cached.at < FEED_TTL_MS) return cached.page;

  const existing = feedInflight.get(key);
  if (existing) return existing;

  const p = fetch(`/api/posts?${params}`)
    .then((r) => r.json())
    .then((page: FeedPage) => {
      feedCache.set(key, { page, at: Date.now() });
      return page;
    })
    .finally(() => {
      feedInflight.delete(key);
    });
  feedInflight.set(key, p);
  return p;
}

export function PostList({ sort, postType, initialPosts, initialHasMore, initialCursor }: PostListProps) {
  const [posts, setPosts] = useState<PostWithRelations[]>(initialPosts ?? []);
  const [loading, setLoading] = useState(initialPosts == null);
  const [hasMore, setHasMore] = useState(initialHasMore ?? false);
  const [cursor, setCursor] = useState<string | undefined>(initialCursor);
  // StrictMode-safe mount guard: when seeded, skip the fetch while sort/postType
  // still match the server-rendered page (null = not seeded → fetch on mount).
  const initialSig = useRef(initialPosts != null ? `${sort}|${postType ?? ""}` : null);

  const fetchPosts = useCallback(
    async (loadMore = false, pageCursor?: string) => {
      setLoading(true);
      const params = new URLSearchParams({ sort });
      if (postType) params.set("type", postType);
      if (loadMore && pageCursor) params.set("cursor", pageCursor);

      try {
        const json = loadMore
          ? await fetch(`/api/posts?${params}`).then((r) => r.json())
          : await fetchFeedPage(`${sort}|${postType ?? ""}`, params);
        if (loadMore) {
          setPosts((prev) => [...prev, ...json.data]);
        } else {
          setPosts(json.data);
        }
        setHasMore(json.hasMore);
        setCursor(json.nextCursor);
      } catch (err) {
        console.error("Failed to fetch posts:", err);
      } finally {
        setLoading(false);
      }
    },
    [sort, postType]
  );

  useEffect(() => {
    const sig = `${sort}|${postType ?? ""}`;
    if (sig === initialSig.current) return; // server-seeded for this sort
    setCursor(undefined);
    void fetchPosts(false);
  }, [sort, postType, fetchPosts]);

  if (loading && posts.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="glass-panel-subtle h-32 animate-pulse rounded-xl bg-muted/40"
          />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    const subtitle =
      sort === "new"
        ? "No fresh pours yet."
        : sort === "hot"
          ? "Nothing's heating up right now."
          : sort === "top"
            ? "No top stories yet."
            : "No stories here yet.";
    return (
      <div className="glass-panel-subtle flex flex-col items-center gap-3 rounded-xl px-6 py-12 text-center">
        <Wine className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{subtitle}</p>
        <Link href="/create" className={buttonVariants({ variant: "glass", size: "lg" })}>
          Share the first one
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post, i) => (
        <Reveal key={post.id} delay={Math.min(i, 6) * 0.05}>
          <PostCard post={post} />
        </Reveal>
      ))}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="glass"
            size="lg"
            onClick={() => fetchPosts(true, cursor)}
            disabled={loading}
          >
            {loading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
