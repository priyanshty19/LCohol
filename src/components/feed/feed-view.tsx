"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AskJames } from "@/components/james/ask-james";
import { PostList } from "./post-list";
import type { FeedSortOption, PostWithRelations } from "@/types/database";

const SORT_OPTIONS: { value: FeedSortOption; label: string }[] = [
  { value: "hot", label: "Hot" },
  { value: "new", label: "New" },
  { value: "top", label: "Top" },
];

export function FeedView({
  initialFeed,
}: {
  initialFeed: { data: PostWithRelations[]; hasMore: boolean; nextCursor?: string };
}) {
  const [sort, setSort] = useState<FeedSortOption>("hot");

  return (
    <div className="space-y-6">
      <AskJames />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Sort feed"
          className="flex items-center gap-1.5"
        >
          {SORT_OPTIONS.map((option) => {
            const active = sort === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSort(option.value)}
                className={cn(
                  "inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-all",
                  active ? "pill-active" : "pill-inactive hover:text-primary"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <Link href="/create">
          <Button variant="gold" size="lg" className="font-display">
            Share a Story
          </Button>
        </Link>
      </div>

      <PostList
        sort={sort}
        initialPosts={initialFeed.data}
        initialHasMore={initialFeed.hasMore}
        initialCursor={initialFeed.nextCursor}
      />
    </div>
  );
}
