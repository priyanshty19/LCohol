"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { bustFeedCache } from "./post-list";

interface VoteButtonsProps {
  postId: string;
  initialScore: number;
  initialVote?: number | null;
}

export function VoteButtons({
  postId,
  initialScore,
  initialVote,
}: VoteButtonsProps) {
  // Score + the viewer's vote move together, so keep them in one state object and
  // update atomically in a single pure updater.
  const [state, setState] = useState<{ score: number; vote: number | null }>({
    score: initialScore,
    vote: initialVote ?? null,
  });
  const { score, vote: userVote } = state;
  const [pending, setPending] = useState(false);

  async function handleVote(value: 1 | -1) {
    if (pending) return;
    setPending(true);
    bustFeedCache(); // a cached first page now holds a stale score/vote for this post

    // Optimistic update first; the server response below is authoritative.
    setState((prev) => {
      if (prev.vote === value) return { score: prev.score - value, vote: null }; // toggle off
      if (prev.vote) return { score: prev.score + value * 2, vote: value }; // flip up<->down
      return { score: prev.score + value, vote: value }; // first vote
    });

    try {
      const res = await fetch(`/api/posts/${postId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const data = (await res.json().catch(() => null)) as
        | { data?: { vote?: number | null; score?: number } }
        | null;
      if (typeof data?.data?.score === "number") {
        setState({ score: data.data.score, vote: data.data.vote ?? null });
      } else if (!res.ok) {
        setState({ score: initialScore, vote: initialVote ?? null });
      }
    } catch {
      setState({ score: initialScore, vote: initialVote ?? null });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        onClick={() => handleVote(1)}
        disabled={pending}
        className={cn(
          "rounded p-1 transition-transform duration-150 hover:scale-110 hover:bg-accent active:scale-90",
          userVote === 1 && "scale-110 text-primary"
        )}
        aria-label="Upvote"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill={userVote === 1 ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 4l-8 8h5v8h6v-8h5z" />
        </svg>
      </button>
      {/* key={score} remounts on change → a quick pop draws the eye to the update */}
      <span
        key={score}
        className={cn(
          "text-sm font-medium tabular-nums duration-200 animate-in zoom-in-75",
          userVote === 1 && "text-primary",
          userVote === -1 && "text-destructive"
        )}
      >
        {score}
      </span>
      <button
        onClick={() => handleVote(-1)}
        disabled={pending}
        className={cn(
          "rounded p-1 transition-transform duration-150 hover:scale-110 hover:bg-accent active:scale-90",
          userVote === -1 && "scale-110 text-destructive"
        )}
        aria-label="Downvote"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill={userVote === -1 ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 20l8-8h-5V4H9v8H4z" />
        </svg>
      </button>
    </div>
  );
}
