import Link from "next/link";
import { cn } from "@/lib/utils";

// Bars and Cocktails are one module, two views: a bar is the *set* (a venue), the
// cocktails it pours are the *subset*. This segmented control sits atop both pages
// so they read as a single "where to go / what to order" experience.
//
// Server component: which tab is active is fully knowable from the page that
// renders it, so it takes an `active` prop instead of subscribing to the router
// (no client JS, no per-navigation re-render).
const TABS = [
  { href: "/bars", label: "Bars", emoji: "🍻" },
  { href: "/cocktails", label: "Cocktails", emoji: "🍸" },
] as const;

export function CatalogTabs({ active }: { active: "/bars" | "/cocktails" }) {
  return (
    <div className="flex flex-col gap-1">
      <div
        role="tablist"
        aria-label="Bars and cocktails"
        className="inline-flex w-fit gap-1 rounded-full border border-border/50 bg-muted/20 p-1"
      >
        {TABS.map((t) => {
          const on = active === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              role="tab"
              aria-selected={on}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                on
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span aria-hidden>{t.emoji}</span>
              {t.label}
            </Link>
          );
        })}
      </div>
      <p className="pl-1 text-xs text-muted-foreground">
        Bars serve the cocktails — hop between where to go and what to order.
      </p>
    </div>
  );
}
