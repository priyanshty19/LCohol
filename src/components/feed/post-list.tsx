"use client";

import { useState, useEffect, useCallback } from "react";
import { PostCard } from "./post-card";
import { Reveal } from "@/components/fx/motion";
import { Button } from "@/components/ui/button";
import type { PostWithRelations, FeedSortOption } from "@/types/database";

interface PostListProps {
  sort: FeedSortOption;
  postType?: string;
}

export function PostList({ sort, postType }: PostListProps) {
  const [posts, setPosts] = useState<PostWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();

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
    return null;
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
