import { cn } from "@/lib/utils";

/**
 * Sip Stories wine-glass mark. Glass outline = currentColor (cream on dark),
 * wine pool = burgundy. Pure vector, themeable, scalable.
 */
export function SipStoriesMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 64"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {/* bowl */}
      <path d="M10 6 H38 C38 24 32 34 24 34 C16 34 10 24 10 6 Z" />
      {/* wine */}
      <path
        d="M13.6 13 C18 16 30 16 34.4 13 C33.4 24 29 31 24 31 C19 31 14.6 24 13.6 13 Z"
        fill="var(--ml-velvet-bright)"
        stroke="none"
      />
      {/* stem */}
      <path d="M24 34 V55" />
      {/* foot */}
      <path d="M14 57 C14 54.6 34 54.6 34 57 C34 59.4 14 59.4 14 57 Z" />
    </svg>
  );
}

/** Full lockup: mark + "Sip Stories" wordmark (italic Sip, like the logo). */
export function SipStoriesLogo({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <SipStoriesMark className={cn("h-7 w-auto text-foreground", markClassName)} />
      <span className="font-display text-xl leading-none tracking-tight">
        <span className="text-glow italic text-primary">Sip</span>{" "}
        <span className="text-foreground">Stories</span>
      </span>
    </span>
  );
}
