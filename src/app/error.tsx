"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Route-segment error boundary. Unlike global-error.tsx (which replaces the whole
// document when the ROOT layout throws), this catches errors thrown while
// rendering a page inside the app shell and offers an in-place retry — the nav
// and chrome stay put, so a transient failure (a slow DB moment, a null field)
// degrades to "give it another pour" instead of a blank screen.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface it for observability; digest correlates with the server log line.
    console.error("[route error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
      <h1 className="font-display text-5xl font-bold text-primary text-glow">Oops</h1>
      <p className="mt-4 font-display text-lg text-foreground">
        Something spilled on our end
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        This page hit a snag. Give it another pour.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button variant="gold" onClick={() => reset()}>
          Try again
        </Button>
        <a href="/">
          <Button variant="glass">Back to feed</Button>
        </a>
      </div>
      {error.digest && (
        <p className="mt-4 text-[10px] text-muted-foreground/50">ref: {error.digest}</p>
      )}
    </div>
  );
}
