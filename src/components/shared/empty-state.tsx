import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

// Shared, warm empty state — a big emoji, a title in the app voice, a subtitle,
// and an optional call to action (a link OR a click handler). Replaces the bare
// one-line "Nothing here yet" text scattered across tabs so a new user always
// gets a friendly nudge toward the next step.
export function EmptyState({
  emoji,
  title,
  subtitle,
  actionLabel,
  actionHref,
  onAction,
  children,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  children?: ReactNode;
}) {
  const action = actionLabel ? (
    actionHref ? (
      <Link href={actionHref}>
        <Button variant="gold" className="font-display">
          {actionLabel}
        </Button>
      </Link>
    ) : (
      <Button variant="gold" className="font-display" onClick={onAction}>
        {actionLabel}
      </Button>
    )
  ) : null;

  return (
    <div className="glass-panel-subtle flex flex-col items-center gap-3 rounded-2xl px-6 py-12 text-center">
      <span className="text-4xl" aria-hidden>
        {emoji}
      </span>
      <div className="space-y-1">
        <p className="font-display text-lg font-semibold text-foreground">{title}</p>
        {subtitle && <p className="mx-auto max-w-sm text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
      {children}
    </div>
  );
}
