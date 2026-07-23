"use client";

import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { CircleView } from "@/components/circle/circle-view";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

type Relationship = "self" | "connected" | "incoming" | "outgoing" | "none";

const DRINKING_STYLE_LABELS: Record<string, string> = {
  SOCIAL: "Social Drinker",
  CONNOISSEUR: "Connoisseur",
  OCCASIONAL: "Occasional",
  EXPLORER: "Explorer",
  PARTY_ANIMAL: "Party Animal",
  MIXOLOGIST: "Mixologist",
  SOBER_CURIOUS: "Sober Curious",
};

interface ProfileViewProps {
  username: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialProfile?: any;
}

export function ProfileView({ username, initialProfile }: ProfileViewProps) {
  // Seeded from the server render; the effect below silently refreshes + polls.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>(initialProfile ?? null);
  const [loading, setLoading] = useState(initialProfile == null);
  const { user: me } = useAuth();
  // The circle (invites + connections) is private — only on your own profile.
  const isOwnProfile = Boolean(me?.username && me.username === username);
  const [rel, setRel] = useState<Relationship>(initialProfile?.viewer?.relationship ?? "none");
  const [reqId, setReqId] = useState<string | null>(initialProfile?.viewer?.requestId ?? null);
  const [busy, setBusy] = useState(false);
  // The page already server-rendered this profile (initialProfile). Skip the
  // first client fetch when seeded — it duplicated the exact SSR query over HTTP
  // on every profile view. The interval/focus re-sync below still refreshes.
  const seeded = useRef(initialProfile != null);

  useEffect(() => {
    let alive = true;
    async function load() {
      const res = await fetch(`/api/profile?username=${username}`);
      if (alive && res.ok) {
        const json = await res.json();
        setProfile(json.data);
        setRel(json.data.viewer?.relationship ?? "none");
        setReqId(json.data.viewer?.requestId ?? null);
      }
      if (alive) setLoading(false);
    }
    if (seeded.current) seeded.current = false; // use the SSR seed for first paint
    else load();

    // Quietly re-sync the relationship so the circle button reflects the other
    // person accepting/declining without a full reload.
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 30000);
    const onFocus = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [username]);

  async function addToCircle() {
    setBusy(true);
    const r = await fetch("/api/connections/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    if (r.ok) setRel("outgoing");
    setBusy(false);
  }

  async function acceptRequest() {
    if (!reqId) return;
    setBusy(true);
    const r = await fetch(`/api/connections/requests/${reqId}/accept`, {
      method: "POST",
    });
    if (r.ok) setRel("connected");
    setBusy(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="font-display text-lg font-medium">User not found</p>
        <Link href="/" className="mt-2 text-sm text-primary hover:underline">
          Back to feed
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card variant="glass">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/20 text-primary text-xl">
                {profile.username[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-bold text-primary">
                {profile.displayName ?? profile.username}
              </h1>
              <p className="text-sm text-muted-foreground">
                @{profile.username}
              </p>
              {profile.bio && (
                <p className="mt-2 text-sm text-foreground/80">
                  {profile.bio}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="recommendation">{profile.shots ?? 0} Shots 🥃</Badge>
                {profile.drinkingStyle && (
                  <Badge variant="topic">
                    {DRINKING_STYLE_LABELS[profile.drinkingStyle] ??
                      profile.drinkingStyle}
                  </Badge>
                )}
                {profile.city && (
                  <Badge variant="topic">
                    {profile.city}
                    {profile.state ? `, ${profile.state}` : ""}
                  </Badge>
                )}
              </div>
            </div>

            {/* Circle action — only when viewing someone else's profile.
                Full-width below the name on phones; top-right on desktop. */}
            {me && rel !== "self" && (
              <div className="w-full sm:w-auto sm:shrink-0">
                {rel === "connected" ? (
                  <Badge variant="recommendation">In your circle ✓</Badge>
                ) : rel === "outgoing" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled
                  >
                    Request sent
                  </Button>
                ) : rel === "incoming" ? (
                  <Button
                    variant="gold"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={busy}
                    onClick={acceptRequest}
                  >
                    Accept request
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={busy}
                    onClick={addToCircle}
                  >
                    + Add to circle
                  </Button>
                )}
              </div>
            )}
          </div>

          <Separator className="my-4 border-border/30" />

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="font-mono text-2xl font-bold text-foreground">
                {profile.user?._count?.posts ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-bold text-foreground">
                {profile.user?._count?.comments ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Comments</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-bold text-primary">
                {profile.shots ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Shots</p>
            </div>
          </div>

          {profile.favoriteDrink && (
            <>
              <Separator className="my-4 border-border/30" />
              <div>
                <p className="font-display text-xs text-muted-foreground uppercase tracking-wider">
                  Favorite Drink
                </p>
                <Link
                  href={`/drinks/${profile.favoriteDrink.slug}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {profile.favoriteDrink.name}
                </Link>
              </div>
            </>
          )}

          <p className="mt-4 text-xs text-muted-foreground">
            Joined{" "}
            {new Date(profile.user?.createdAt).toLocaleDateString("en-IN", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </CardContent>
      </Card>

      {isOwnProfile && (
        <>
          <Card variant="glass">
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Your Vibe
                </h2>
                <Link
                  href="/vibe"
                  className="shrink-0 text-xs text-primary underline-offset-2 hover:underline"
                >
                  Mood explorer →
                </Link>
              </div>
              <p className="text-xs text-muted-foreground">
                Pick a mood. It themes the whole app and follows you across
                devices.
              </p>
              <ThemeSwitcher />
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardContent className="space-y-3 pt-6">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Legal &amp; Safety
              </h2>
              <div className="flex flex-col divide-y divide-border/30">
                <Link href="/Terms-and-Condition" className="py-2 text-sm text-foreground/90 hover:text-primary">
                  Terms of Service
                </Link>
                <Link href="/Privacy-Policy" className="py-2 text-sm text-foreground/90 hover:text-primary">
                  Privacy Policy
                </Link>
                <Link href="/compliance/grievance" className="py-2 text-sm text-foreground/90 hover:text-primary">
                  Grievance Officer
                </Link>
                <Link href="/help" className="py-2 text-sm text-[var(--ml-sos)] hover:underline">
                  🆘 Help &amp; Safety
                </Link>
              </div>
            </CardContent>
          </Card>

          <Separator className="border-border/30" />
          <CircleView embedded />
        </>
      )}
    </div>
  );
}
