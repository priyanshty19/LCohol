"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { CommentWithRelations } from "@/types/database";

interface CommentThreadProps {
  postId: string;
  comments: CommentWithRelations[];
  onCommentAdded: () => void;
}

export function CommentThread({
  postId,
  comments,
  onCommentAdded,
}: CommentThreadProps) {
  return (
    <div className="space-y-4">
      <CommentInput postId={postId} onSubmit={onCommentAdded} />
      <div className="space-y-3">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            postId={postId}
            onReply={onCommentAdded}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
}

function CommentInput({
  postId,
  parentId,
  onSubmit,
  onCancel,
}: {
  postId: string;
  parentId?: string;
  onSubmit: () => void;
  onCancel?: () => void;
}) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), parentId }),
      });

      if (res.ok) {
        setBody("");
        onSubmit();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        placeholder={parentId ? "Write a reply..." : "Share your thoughts..."}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={parentId ? 2 : 3}
        maxLength={5000}
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={loading || !body.trim()}>
          {loading ? "Posting..." : parentId ? "Reply" : "Comment"}
        </Button>
      </div>
    </form>
  );
}

function CommentItem({
  comment,
  postId,
  onReply,
  depth,
}: {
  comment: CommentWithRelations;
  postId: string;
  onReply: () => void;
  depth: number;
}) {
  const [showReply, setShowReply] = useState(false);
  const username = comment.author?.profile?.username ?? "anonymous";
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
  });

  return (
    <div className={cn("space-y-2", depth > 0 && "ml-6 border-l border-border/30 pl-4")}>
      <div className="flex items-start gap-3">
        <Avatar className="h-6 w-6">
          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
            {username[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {comment.author?.profile?.displayName ?? username}
            </span>
            <span>{timeAgo}</span>
          </div>
          <p className="mt-0.5 text-sm text-foreground/90 whitespace-pre-wrap">
            {comment.body}
          </p>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{comment.score} points</span>
            {depth < 3 && (
              <button
                onClick={() => setShowReply(!showReply)}
                className="hover:text-foreground"
              >
                Reply
              </button>
            )}
          </div>
        </div>
      </div>

      {showReply && (
        <div className="ml-9">
          <CommentInput
            postId={postId}
            parentId={comment.id}
            onSubmit={() => {
              setShowReply(false);
              onReply();
            }}
            onCancel={() => setShowReply(false)}
          />
        </div>
      )}

      {comment.replies?.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          postId={postId}
          onReply={onReply}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}
