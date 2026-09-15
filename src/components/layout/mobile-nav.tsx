"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type LucideIcon,
  Home,
  PartyPopper,
  Martini,
  FlaskConical,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Five equal tabs — Post is NOT here (it's the always-visible button in the top
// bar, so a center FAB would just duplicate it). Bars & Cocktails is one tab
// (the page carries the Bars|Cocktails toggle); `match` lights it on both routes.
const ITEMS: { href: string; label: string; icon: LucideIcon; match?: string[] }[] = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/parties", label: "Parties", icon: PartyPopper },
  { href: "/bars", label: "Bars", icon: Martini, match: ["/bars", "/cocktails"] },
  { href: "/mix", label: "Mix Lab", icon: FlaskConical },
  { href: "/search", label: "Search", icon: Search },
];

function NavBtn({ it, active }: { it: (typeof ITEMS)[number]; active: boolean }) {
  const Icon = it.icon;
  return (
    <Link
      href={it.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        // min-h 44px = comfortable touch target; equal flex columns keep the bar balanced.
        "relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {/* Stitch bottom nav marks the active tab with a lit pip on the top edge
          as well as the colour change — the colour alone was easy to miss on the
          darker vibe themes. */}
      {active && <span className="nav-pip" aria-hidden />}
      <Icon
        className={cn(
          "h-5 w-5 transition-transform",
          // Glow tracks the active vibe's --primary (was hardcoded gold, which
          // clashed with the themed text label on every non-gold vibe).
          active && "scale-110 drop-shadow-[0_0_8px_var(--primary)]"
        )}
      />
      {it.label}
    </Link>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const active = (it: (typeof ITEMS)[number]) =>
    (it.match ?? [it.href]).some((p) =>
      p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/")
    );

  return (
    <nav
      aria-label="Primary"
      // border-t (not glass-nav's border-bottom) so the divider faces the page
      // content scrolling under this bottom-docked bar.
      className="glass-nav pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-[var(--glass-border)] md:hidden"
    >
      <div className="flex items-stretch justify-around px-1">
        {ITEMS.map((it) => (
          <NavBtn key={it.href} it={it} active={active(it)} />
        ))}
      </div>
    </nav>
  );
}
