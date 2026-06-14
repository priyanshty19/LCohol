"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon, Home, Wine, Plus, Beer, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/drinks", label: "Drinks", icon: Wine },
  { href: "/bars", label: "Bars", icon: Beer },
  { href: "/vibe", label: "Vibe", icon: Moon },
];

function NavBtn({ it, active }: { it: (typeof ITEMS)[number]; active: boolean }) {
  const Icon = it.icon;
  return (
    <Link
      href={it.href}
      className={cn(
        "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5",
          active && "drop-shadow-[0_0_6px_rgba(242,191,100,0.65)]"
        )}
      />
      {it.label}
    </Link>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="glass-nav pb-safe fixed inset-x-0 bottom-0 z-40 md:hidden">
      <div className="flex items-center justify-around px-2 py-1.5">
        <NavBtn it={ITEMS[0]} active={active(ITEMS[0].href)} />
        <NavBtn it={ITEMS[1]} active={active(ITEMS[1].href)} />

        <Link
          href="/create"
          aria-label="Create a post"
          className="btn-gold -mt-6 flex h-12 w-12 items-center justify-center rounded-full text-primary-foreground shadow-lg"
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </Link>

        <NavBtn it={ITEMS[2]} active={active(ITEMS[2].href)} />
        <NavBtn it={ITEMS[3]} active={active(ITEMS[3].href)} />
      </div>
    </nav>
  );
}
