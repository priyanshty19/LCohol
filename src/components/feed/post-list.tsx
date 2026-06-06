"use client";

import { useState, useEffect, useCallback } from "react";
import { PostCard } from "./post-card";
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
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-lg bg-card/50"
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
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
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
