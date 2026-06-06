"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostList } from "./post-list";
import type { FeedSortOption } from "@/types/database";

export function FeedView() {
  const [sort, setSort] = useState<FeedSortOption>("hot");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Tabs
          value={sort}
          onValueChange={(v) => setSort(v as FeedSortOption)}
        >
          <TabsList>
            <TabsTrigger value="hot">Hot</TabsTrigger>
            <TabsTrigger value="new">New</TabsTrigger>
            <TabsTrigger value="top">Top</TabsTrigger>
          </TabsList>
        </Tabs>
        <Link href="/create">
          <Button size="sm">Share a Story</Button>
        </Link>
      </div>

      <PostList sort={sort} />
    </div>
  );
}
