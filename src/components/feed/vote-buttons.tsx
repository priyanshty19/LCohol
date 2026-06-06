"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

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
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState<number | null>(initialVote ?? null);
  const [loading, setLoading] = useState(false);

  async function handleVote(value: 1 | -1) {
    if (loading) return;
    setLoading(true);

    const prevScore = score;
    const prevVote = userVote;

    if (userVote === value) {
      setScore(score - value);
      setUserVote(null);
    } else if (userVote) {
      setScore(score + value * 2);
      setUserVote(value);
    } else {
      setScore(score + value);
      setUserVote(value);
    }

    try {
      const res = await fetch(`/api/posts/${postId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });

      if (!res.ok) {
        setScore(prevScore);
        setUserVote(prevVote);
      }
    } catch {
      setScore(prevScore);
      setUserVote(prevVote);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        onClick={() => handleVote(1)}
        disabled={loading}
        className={cn(
          "rounded p-1 transition-colors hover:bg-accent",
          userVote === 1 && "text-primary"
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
      <span
        className={cn(
          "text-sm font-medium tabular-nums",
          userVote === 1 && "text-primary",
          userVote === -1 && "text-destructive"
        )}
      >
        {score}
      </span>
      <button
        onClick={() => handleVote(-1)}
        disabled={loading}
        className={cn(
          "rounded p-1 transition-colors hover:bg-accent",
          userVote === -1 && "text-destructive"
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
