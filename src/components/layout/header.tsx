"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, bustAuthCache } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { SipStoriesLogo } from "@/components/brand/logo";
import { NotificationBell } from "./notification-bell";

// Mirrors the mobile core (Feed · Parties · Mix Lab · Search) plus the two
// browse surfaces desktop has room for. Bars + Cocktails are one entry (set/
// subset) — the page itself carries the Bars|Cocktails toggle. Vibe is no longer
// a top-level destination; it lives in the avatar menu and on your profile.
const NAV: { href: string; label: string; match?: string[] }[] = [
  { href: "/", label: "Feed" },
  { href: "/parties", label: "🎉 Parties" },
  { href: "/mix", label: "Mix Lab" },
  { href: "/bars", label: "🍸 Bars & Cocktails", match: ["/bars", "/cocktails"] },
  { href: "/drinks", label: "Drinks" },
  { href: "/search", label: "Search" },
];

export function Header() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    bustAuthCache(); // soft-nav keeps the module cache — clear it so we don't show the old user
    router.push("/login");
    router.refresh();
  }

  // Path-boundary guarded so "/bars" never lights on a future "/bars-archive".
  const isActive = (n: (typeof NAV)[number]) =>
    (n.match ?? [n.href]).some((p) =>
      p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/"),
    );

  // For a merged entry (Bars & Cocktails), link to whichever sub-route you're
  // already on so the lit tab is a no-op instead of bouncing /cocktails → /bars.
  const hrefFor = (n: (typeof NAV)[number]) => {
    const here = n.match?.find(
      (p) => pathname === p || pathname.startsWith(p + "/"),
    );
    return here ?? n.href;
  };

  return (
    <header className="glass-nav sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-5">
          <Link href="/" aria-label="Sip Stories home">
            <SipStoriesLogo />
          </Link>
          <nav className="hidden items-center gap-0.5 md:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={hrefFor(n)}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    // Theme-aware hover (primary is vivid in every vibe, so the
                    // highlight stays visible on both light and dark nav bars).
                    "hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/15",
                    isActive(n) && "text-primary",
                  )}
                >
                  {n.label}
                </Button>
              </Link>
            ))}
            <Link href="/hangover">
              <Button
                variant="ghost"
                size="sm"
                className="text-[var(--ml-sos)] hover:text-[var(--ml-sos)]"
              >
                🆘 SOS
              </Button>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/create">
            <Button variant="gold" size="sm">
              Post
            </Button>
          </Link>

          {user && <NotificationBell />}

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/20 text-xs text-primary">
                    {user.username?.[0]?.toUpperCase() ??
                      user.email?.[0]?.toUpperCase() ??
                      "?"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-60 p-1.5 [&_[data-slot=dropdown-menu-item]]:min-h-9 [&_[data-slot=dropdown-menu-item]]:px-2.5 [&_[data-slot=dropdown-menu-item]]:py-2 [&_[data-slot=dropdown-menu-item]]:whitespace-nowrap"
              >
                <DropdownMenuItem>
                  <Link
                    href="/help"
                    className="w-full font-medium text-[var(--ml-sos)]"
                  >
                    🆘 Help &amp; Safety
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href={`/profile/${user.username ?? ""}`} className="w-full">
                    My profile &amp; circle
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/vibe" className="w-full">
                    🌙 Tonight&apos;s vibe
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/settings" className="w-full">
                    Settings
                  </Link>
                </DropdownMenuItem>
                {/* Terms & Privacy now live only under the profile (legal &
                    safety card) + the signup consent step — not duplicated here. */}
                {(user.role === "ADMIN" || user.role === "MODERATOR") && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Link href="/moderation" className="w-full">
                        Moderation
                      </Link>
                    </DropdownMenuItem>
                    {user.role === "ADMIN" && (
                      <DropdownMenuItem>
                        <Link href="/admin" className="w-full">
                          Admin
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} variant="destructive">
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
