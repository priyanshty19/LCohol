"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { VoteButtons } from "./vote-buttons";
import { ReportButton } from "./report-button";
import { CommentThread } from "./comment-thread";
import type { PostWithRelations, CommentWithRelations } from "@/types/database";
import { formatDistanceToNow } from "date-fns";

type PostTypeBadgeVariant =
  | "story"
  | "question"
  | "review"
  | "recommendation"
  | "meme";

const POST_TYPE_VARIANTS: Record<string, PostTypeBadgeVariant> = {
  STORY: "story",
  QUESTION: "question",
  REVIEW: "review",
  RECOMMENDATION: "recommendation",
  MEME: "meme",
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
        <div className="glass-panel-subtle h-48 animate-pulse rounded-xl bg-muted/40" />
        <div className="glass-panel-subtle h-32 animate-pulse rounded-xl bg-muted/40" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="font-display text-lg font-medium text-foreground">
          Post not found
        </p>
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
      <Card variant="glass" className="py-0">
        <div className="flex gap-4 p-5">
          <VoteButtons
            postId={post.id}
            initialScore={post.score}
            initialVote={post.userVote}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge
                variant={POST_TYPE_VARIANTS[post.postType] ?? "topic"}
                className="text-[10px] font-semibold uppercase tracking-wider"
              >
                {post.postType.toLowerCase()}
              </Badge>
              <span>
                by{" "}
                <Link
                  href={`/profile/${username}`}
                  className="font-medium text-foreground transition-colors hover:text-primary"
                >
                  {post.author?.profile?.displayName ?? username}
                </Link>
              </span>
              <span className="text-muted-foreground/60">{timeAgo}</span>
            </div>

            <h1 className="mt-2 font-display text-2xl font-semibold leading-tight text-foreground">
              {post.title}
            </h1>

            {post.body && (
              <div className="mt-3 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {post.body}
              </div>
            )}

            {post.imageUrl && (
              <div className="relative mt-4 w-full overflow-hidden rounded-xl border border-border/10">
                <Image
                  src={post.imageUrl}
                  alt={post.title}
                  width={1200}
                  height={800}
                  className="h-auto w-full object-cover"
                  sizes="(max-width: 768px) 100vw, 640px"
                  unoptimized
                />
              </div>
            )}

            {post.drinks.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {post.drinks.map(({ drink }) => (
                  <Link key={drink.id} href={`/drinks/${drink.slug}`}>
                    <Badge
                      variant="drink"
                      className="transition-colors hover:bg-primary/20"
                    >
                      🥃 {drink.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}

            {post.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {post.tags.map(({ tag }) => (
                  <Badge
                    key={tag.id}
                    variant="topic"
                    className="text-[11px]"
                  >
                    #{tag.name}
                  </Badge>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <ReportButton postId={post.id} />
            </div>
          </div>
        </div>
      </Card>

      <Separator className="border-border/30" />

      <div>
        <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-primary">
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
