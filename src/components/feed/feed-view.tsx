"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreatePostForm } from "./create-post-form";
import { PostList } from "./post-list";
import type { FeedSortOption, PostWithRelations } from "@/types/database";

const SORT_OPTIONS: { value: FeedSortOption; label: string }[] = [
  { value: "for-you", label: "For You" },
  { value: "hot", label: "Hot" },
  { value: "new", label: "New" },
  { value: "top", label: "Top" },
];

export function FeedView({
  initialFeed,
}: {
  initialFeed: { data: PostWithRelations[]; hasMore: boolean; nextCursor?: string };
}) {
  const [sort, setSort] = useState<FeedSortOption>("for-you");
  const [composerOpen, setComposerOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogTrigger
          className="glass-panel-subtle flex min-h-14 w-full items-center rounded-2xl px-4 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          Share something with SipStories...
        </DialogTrigger>
        <DialogContent
          showCloseButton={false}
          className="max-h-[88vh] overflow-y-auto bg-transparent p-0 ring-0 sm:max-w-2xl"
        >
          <DialogTitle className="sr-only">Share something with SipStories</DialogTitle>
          <CreatePostForm
            mode="inline"
            onMinimize={() => setComposerOpen(false)}
            onCreated={() => {
              setComposerOpen(false);
              setRefreshKey((key) => key + 1);
            }}
          />
        </DialogContent>
      </Dialog>

      <div
        role="tablist"
        aria-label="Sort feed"
        className="flex flex-wrap items-center justify-center gap-1.5"
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

      <PostList
        key={refreshKey}
        sort={sort}
        initialPosts={initialFeed.data}
        initialHasMore={initialFeed.hasMore}
        initialCursor={initialFeed.nextCursor}
      />
    </div>
  );
}
