"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CommentThread } from "./comment-thread";
import type { CommentWithRelations } from "@/types/database";

// Lets a feed card open comments in a blurred modal instead of navigating to the
// post page first. Reuses the same CommentThread + /comments API as the post
// detail, so posting/replying behaviour is identical — no logic forked.
export function CommentModal({
  postId,
  postTitle,
  count,
}: {
  postId: string;
  postTitle: string;
  count: number;
}) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<CommentWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      if (res.ok) {
        const json = await res.json();
        setComments(json.data ?? []);
      }
    } catch {
      /* leave the thread empty; the input still works */
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }

  // Lazy-load on first open only (don't fetch every card's comments up front).
  useEffect(() => {
    if (!open || loaded) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const shown = loaded ? comments.length : count;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex min-h-[44px] items-center gap-1.5 rounded-lg px-1 text-xs text-muted-foreground/60 transition-colors hover:text-primary">
        <MessageCircle className="h-3.5 w-3.5" />
        {count} {count === 1 ? "comment" : "comments"}
      </DialogTrigger>

      <DialogContent className="flex max-h-[82vh] flex-col gap-3 sm:max-w-lg">
        <DialogTitle className="line-clamp-2 pr-8 font-display text-lg">
          {postTitle}
        </DialogTitle>
        <p className="-mt-2 text-xs text-muted-foreground">
          {shown} {shown === 1 ? "comment" : "comments"}
        </p>
        <div className="-mx-1 flex-1 overflow-y-auto px-1 pb-1">
          {loading && !loaded ? (
            <div className="space-y-3 py-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : (
            <CommentThread postId={postId} comments={comments} onCommentAdded={load} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
