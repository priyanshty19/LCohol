import Link from "next/link";
import { cn } from "@/lib/utils";

// Bars, Cocktails, and My Drinks are one discovery module: where to go, what to
// order, and what the signed-in user has made themselves.
//
// Server component: which tab is active is fully knowable from the page that
// renders it, so it takes an `active` prop instead of subscribing to the router
// (no client JS, no per-navigation re-render).
const TABS = [
  { href: "/bars", label: "Bars", emoji: "🍻" },
  { href: "/cocktails", label: "Cocktails", emoji: "🍸" },
  { href: "/cocktails/mine", label: "My Drinks", emoji: "🥂" },
] as const;

type CatalogTab = (typeof TABS)[number]["href"];

const DESCRIPTIONS: Record<CatalogTab, string> = {
  "/bars": "Find the right place, then see what to order when you get there.",
  "/cocktails": "Explore cocktails from the community and India's best bars.",
  "/cocktails/mine": "Your saved Mix Lab creations, all together and easy to find.",
};

export function CatalogTabs({ active }: { active: CatalogTab }) {
  return (
    <div className="flex flex-col gap-1">
      <div
        role="tablist"
        aria-label="Drink discovery"
        className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-border/50 bg-muted/20 p-1"
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
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:px-4",
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
        {DESCRIPTIONS[active]}
      </p>
    </div>
  );
}
