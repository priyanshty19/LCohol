"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
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

const NAV = [
  { href: "/", label: "Feed" },
  { href: "/drinks", label: "Drinks" },
  { href: "/cocktails", label: "🍸 Cocktails" },
  { href: "/bars", label: "🍻 Bars" },
  { href: "/parties", label: "🎉 Parties" },
  { href: "/mix", label: "Mix Lab" },
  { href: "/vibe", label: "Vibe" },
  { href: "/search", label: "Search" },
];

export function Header() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="glass-nav sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-5">
          <Link href="/" aria-label="Sip Stories home">
            <SipStoriesLogo />
          </Link>
          <nav className="hidden items-center gap-0.5 md:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    // Theme-aware hover (primary is vivid in every vibe, so the
                    // highlight stays visible on both light and dark nav bars).
                    "hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/15",
                    isActive(n.href) && "text-primary",
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
              <DropdownMenuContent align="end">
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
                  <Link href="/parties" className="w-full">
                    🎉 Parties
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/settings" className="w-full">
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href="/compliance/terms" className="w-full">
                    Terms
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/compliance/privacy" className="w-full">
                    Privacy
                  </Link>
                </DropdownMenuItem>
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
