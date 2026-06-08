"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Header() {
  const { user } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-primary">
            SIPSTORIES
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Link href="/">
              <Button variant="ghost" size="sm">
                Feed
              </Button>
            </Link>
            <Link href="/drinks">
              <Button variant="ghost" size="sm">
                Drinks
              </Button>
            </Link>
            <Link href="/search">
              <Button variant="ghost" size="sm">
                Search
              </Button>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/create">
            <Button size="sm">Post</Button>
          </Link>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {user.email?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  variant="destructive"
                >
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
