"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",        label: "Feed",  emoji: "🏠" },
  { href: "/drinks",  label: "Drinks",emoji: "🥃" },
  { href: "/create",  label: "+",     emoji: "+" },
  { href: "/mix",     label: "Mix",   emoji: "🧪" },
  { href: "/vibe",    label: "Vibe",  emoji: "🌙" },
  { href: "/hangover",label: "SOS",   emoji: "🆘" },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden">
      <div className="flex items-center justify-around py-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const isCreate = item.label === "+";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] transition-colors",
                isCreate
                  ? "rounded-full bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground"
                  : isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="text-base">{item.emoji}</span>
              {!isCreate && item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
