"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-ambient flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center antialiased">
        <h1 className="font-display text-7xl font-bold text-primary text-glow">
          Oops
        </h1>
        <p className="mt-4 font-display text-lg text-foreground">
          Something spilled on our end
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          An unexpected error occurred. Give it another pour.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Button variant="gold" onClick={() => reset()}>
            Try again
          </Button>
          <a href="/">
            <Button variant="glass">Back to feed</Button>
          </a>
        </div>
      </body>
    </html>
  );
}
