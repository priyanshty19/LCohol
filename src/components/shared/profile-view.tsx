"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

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
}

export function ProfileView({ username }: ProfileViewProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/profile?username=${username}`);
      if (res.ok) {
        const json = await res.json();
        setProfile(json.data);
      }
      setLoading(false);
    }
    load();
  }, [username]);

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
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/20 text-primary text-xl">
                {profile.username[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
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
    </div>
  );
}
