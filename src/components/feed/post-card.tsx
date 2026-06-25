import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { VoteButtons } from "./vote-buttons";
import { ReportButton } from "./report-button";
import { ShareButton } from "./share-button";
import { CommentModal } from "./comment-modal";
import { renderMentions } from "@/components/shared/render-mentions";
import type { PostWithRelations } from "@/types/database";
import { formatDistanceToNow } from "date-fns";

interface PostCardProps {
  post: PostWithRelations;
}

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

const POST_TYPE_LABELS: Record<string, string> = {
  STORY: "story",
  QUESTION: "question",
  REVIEW: "review",
  RECOMMENDATION: "rec",
  MEME: "meme",
};

export function PostCard({ post }: PostCardProps) {
  const username = post.author?.profile?.username ?? "anonymous";
  const displayName = post.author?.profile?.displayName ?? username;
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
  });
  const initial = (displayName[0] ?? "?").toUpperCase();

  return (
    <Card
      variant="glass"
      className="drink-card-hover group overflow-hidden py-0 hover:border-primary/30"
    >
      <div className="flex gap-3 p-4">
        {/* Vote buttons */}
        <VoteButtons
          postId={post.id}
          initialScore={post.score}
          initialVote={post.userVote}
        />

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge
              variant={POST_TYPE_VARIANTS[post.postType] ?? "topic"}
              className="text-[10px] font-semibold uppercase tracking-wider"
            >
              {POST_TYPE_LABELS[post.postType] ?? post.postType.toLowerCase()}
            </Badge>
            <div className="flex items-center gap-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                {initial}
              </div>
              <Link
                href={`/profile/${username}`}
                className="font-medium text-foreground/80 transition-colors hover:text-primary"
              >
                {displayName}
              </Link>
            </div>
            <span className="text-muted-foreground/60">{timeAgo}</span>
          </div>

          {/* Title (links to post) + body (separate so @mention links don't nest anchors) */}
          <Link href={`/post/${post.id}`} className="mt-2 block">
            <h2 className="font-display text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
              {post.title}
            </h2>
          </Link>
          {post.body && (
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground/80">
              {renderMentions(post.body)}
            </p>
          )}

          {/* Image */}
          {post.imageUrl && (
            <Link href={`/post/${post.id}`} className="mt-3 block">
              <div className="relative h-48 w-full overflow-hidden rounded-lg border border-border/10 sm:h-56">
                <Image
                  src={post.imageUrl}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  sizes="(max-width: 768px) 100vw, 600px"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            </Link>
          )}

          {/* Drink tags */}
          {post.drinks.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
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

          {/* Topic tags */}
          {post.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {post.tags.map(({ tag }) => (
                <Badge key={tag.id} variant="topic" className="text-[11px]">
                  #{tag.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Footer — comments open in a blurred modal (no full navigation) */}
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground/60">
            <CommentModal
              postId={post.id}
              postTitle={post.title}
              count={post._count.comments}
            />
            <ShareButton postId={post.id} />
            <ReportButton postId={post.id} className="ml-auto" />
          </div>
        </div>
      </div>
    </Card>
  );
}
