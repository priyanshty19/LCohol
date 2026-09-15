"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { bustFeedCache } from "./post-list";
import {
  beginVoteRequest,
  finishVoteRequest,
  parseVoteResponse,
  type VoteState,
} from "./vote-state";

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
  const [state, setState] = useState<VoteState>({
    score: initialScore,
    vote: initialVote === 1 || initialVote === -1 ? initialVote : null,
  });
  const { score, vote: userVote } = state;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestInFlight = useRef(false);

  async function handleVote(value: 1 | -1) {
    if (!beginVoteRequest(requestInFlight)) return;
    setPending(true);
    setError(null);
    bustFeedCache(); // a cached first page now holds a stale score/vote for this post

    try {
      const res = await fetch(`/api/posts/${postId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const data = (await res.json().catch(() => null)) as { data?: unknown } | null;
      const next = parseVoteResponse(data?.data);
      if (res.ok && next) {
        setState(next);
      } else {
        setError("Vote was not saved. Please try again.");
      }
    } catch {
      setError("Vote was not saved. Please try again.");
    } finally {
      finishVoteRequest(requestInFlight);
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
      <span
        className={cn(
          "text-sm font-medium tabular-nums",
          userVote === 1 && "text-primary",
          userVote === -1 && "text-destructive"
        )}
        aria-live="polite"
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
      {error && <span className="sr-only" role="status">{error}</span>}
    </div>
  );
}
