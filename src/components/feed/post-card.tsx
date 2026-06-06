import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { VoteButtons } from "./vote-buttons";
import type { PostWithRelations } from "@/types/database";
import { formatDistanceToNow } from "date-fns";

interface PostCardProps {
  post: PostWithRelations;
}

const POST_TYPE_STYLES: Record<string, string> = {
  STORY: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  QUESTION: "bg-green-500/10 text-green-400 border-green-500/20",
  REVIEW: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  RECOMMENDATION: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  MEME: "bg-pink-500/10 text-pink-400 border-pink-500/20",
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
    <Card className="group overflow-hidden border-border/20 bg-card/40 backdrop-blur-sm transition-all duration-200 hover:border-primary/20 hover:bg-card/60 hover:shadow-lg hover:shadow-primary/5">
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
              variant="outline"
              className={`px-2 py-0 text-[10px] font-semibold uppercase tracking-wider ${POST_TYPE_STYLES[post.postType] ?? ""}`}
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

          {/* Title + body */}
          <Link href={`/post/${post.id}`} className="mt-2 block">
            <h2 className="text-[15px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
              {post.title}
            </h2>
            {post.body && (
              <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground/80">
                {post.body}
              </p>
            )}
          </Link>

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
                    variant="outline"
                    className="border-primary/30 bg-primary/5 text-xs text-primary transition-colors hover:bg-primary/10"
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
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="border-border/30 bg-muted/30 text-[11px] text-muted-foreground/70"
                >
                  #{tag.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground/60">
            <Link
              href={`/post/${post.id}`}
              className="flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {post._count.comments}{" "}
              {post._count.comments === 1 ? "comment" : "comments"}
            </Link>
            <button className="flex items-center gap-1.5 transition-colors hover:text-foreground">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              Share
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
