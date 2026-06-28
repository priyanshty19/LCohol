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

export function PostList({ sort, postType, initialPosts, initialHasMore, initialCursor }: PostListProps) {
  const [posts, setPosts] = useState<PostWithRelations[]>(initialPosts ?? []);
  const [loading, setLoading] = useState(initialPosts == null);
  const [hasMore, setHasMore] = useState(initialHasMore ?? false);
  const [cursor, setCursor] = useState<string | undefined>(initialCursor);
  // StrictMode-safe mount guard: when seeded, skip the fetch while sort/postType
  // still match the server-rendered page (null = not seeded → fetch on mount).
  const initialSig = useRef(initialPosts != null ? `${sort}|${postType ?? ""}` : null);

  const fetchPosts = useCallback(
    async (loadMore = false) => {
      setLoading(true);
      const params = new URLSearchParams({ sort });
      if (postType) params.set("type", postType);
      if (loadMore && cursor) params.set("cursor", cursor);

      try {
        const res = await fetch(`/api/posts?${params}`);
        const json = await res.json();
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
    [sort, postType, cursor]
  );

  useEffect(() => {
    const sig = `${sort}|${postType ?? ""}`;
    if (sig === initialSig.current) return; // server-seeded for this sort
    setCursor(undefined);
    fetchPosts(false);
  }, [sort, postType]);

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
            onClick={() => fetchPosts(true)}
            disabled={loading}
          >
            {loading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
