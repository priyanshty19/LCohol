import { cn } from "@/lib/utils";

// Shared shimmer placeholder for client-fetched content that would otherwise
// pop in (or show bare "Loading…" text). Matches the feed's pulse treatment so
// every loading surface reads the same.
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/40", className)}
      {...props}
    />
  );
}

// A row of card-shaped skeletons — drop-in for list sections while they load.
export function CardListSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}
