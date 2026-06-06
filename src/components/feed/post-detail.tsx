"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { VoteButtons } from "./vote-buttons";
import { CommentThread } from "./comment-thread";
import type { PostWithRelations, CommentWithRelations } from "@/types/database";
import { formatDistanceToNow } from "date-fns";

const POST_TYPE_STYLES: Record<string, string> = {
  STORY: "bg-blue-500/10 text-blue-400",
  QUESTION: "bg-green-500/10 text-green-400",
  REVIEW: "bg-purple-500/10 text-purple-400",
  RECOMMENDATION: "bg-amber-500/10 text-amber-400",
  MEME: "bg-pink-500/10 text-pink-400",
};

interface PostDetailProps {
  postId: string;
}

export function PostDetail({ postId }: PostDetailProps) {
  const [post, setPost] = useState<PostWithRelations | null>(null);
  const [comments, setComments] = useState<CommentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/posts/${postId}/comments`);
    if (res.ok) {
      const json = await res.json();
      setComments(json.data);
    }
  }, [postId]);

  useEffect(() => {
    async function load() {
      const [postRes] = await Promise.all([
        fetch(`/api/posts/${postId}`),
        fetchComments(),
      ]);
      if (postRes.ok) {
        const json = await postRes.json();
        setPost(json.data);
      }
      setLoading(false);
    }
    load();
  }, [postId, fetchComments]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="h-48 animate-pulse rounded-lg bg-card/50" />
        <div className="h-32 animate-pulse rounded-lg bg-card/50" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="text-lg font-medium">Post not found</p>
        <Link href="/" className="mt-2 text-sm text-primary hover:underline">
          Back to feed
        </Link>
      </div>
    );
  }

  const username = post.author?.profile?.username ?? "anonymous";
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex gap-4">
        <VoteButtons
          postId={post.id}
          initialScore={post.score}
          initialVote={post.userVote}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge
              variant="secondary"
              className={POST_TYPE_STYLES[post.postType] ?? ""}
            >
              {post.postType.toLowerCase()}
            </Badge>
            <span>
              by{" "}
              <Link
                href={`/profile/${username}`}
                className="font-medium text-foreground hover:text-primary"
              >
                {post.author?.profile?.displayName ?? username}
              </Link>
            </span>
            <span>{timeAgo}</span>
          </div>

          <h1 className="mt-2 text-xl font-bold leading-tight">
            {post.title}
          </h1>

          {post.body && (
            <div className="mt-3 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {post.body}
            </div>
          )}

          {post.drinks.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1">
              {post.drinks.map(({ drink }) => (
                <Link key={drink.id} href={`/drinks/${drink.slug}`}>
                  <Badge
                    variant="outline"
                    className="border-primary/30 text-primary hover:bg-primary/10"
                  >
                    {drink.name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}

          {post.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {post.tags.map(({ tag }) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="border-border/50 text-xs"
                >
                  #{tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <Separator className="border-border/30" />

      <div>
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
        </h2>
        <CommentThread
          postId={post.id}
          comments={comments}
          onCommentAdded={fetchComments}
        />
      </div>
    </div>
  );
}
