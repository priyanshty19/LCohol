"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreatePartyFlow } from "./create-party-flow";

type Party = {
  id: string;
  title: string;
  status: "UPCOMING" | "CANCELLED" | "PAST";
  startsAt?: string | Date | null;
  eventDate?: string | Date | null;
  locationText?: string | null;
  bar?: { name: string; city: string } | null;
  author?: { profile?: { username?: string | null } | null } | null;
  _count?: { invites?: number };
  invites?: { rsvp: string }[];
  visibility?: "PUBLIC" | "CIRCLE" | "PRIVATE";
};

type PartyTab = "open" | "invited" | "expired" | "created";

const RSVP_TONE: Record<string, string> = {
  GOING: "text-primary",
  MAYBE: "text-yellow-500",
  DECLINED: "text-muted-foreground/60",
  INVITED: "text-muted-foreground",
};

function venueLine(p: Party): string {
  if (p.bar) return `${p.bar.name}, ${p.bar.city}`;
  if (p.locationText) return p.locationText;
  return "Venue TBA";
}

function whenLine(p: Party): string | null {
  const d = p.startsAt ?? p.eventDate;
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function partyTime(p: Party): Date | null {
  const d = p.startsAt ?? p.eventDate;
  if (!d) return null;
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isExpired(p: Party, now = new Date()): boolean {
  if (p.status === "PAST") return true;
  const d = partyTime(p);
  if (!d) return false;
  if (p.startsAt) return d.getTime() < now.getTime();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

function emptyCopy(tab: PartyTab) {
  if (tab === "open") {
    return {
      title: "No open parties right now",
      subtitle: "Public parties that are live or coming up will appear here.",
    };
  }
  if (tab === "expired") {
    return {
      title: "No expired parties",
      subtitle: "Past plans will settle here once their date has passed.",
    };
  }
  if (tab === "created") {
    return {
      title: "You haven't created a party yet",
      subtitle: "Throw one, pick the drinks, and invite your circle.",
    };
  }
  return {
    title: "No active invites",
    subtitle: "Party invites you can still attend will show up here.",
  };
}

function PartyCard({ p, myRsvp, expired, open }: { p: Party; myRsvp?: string; expired?: boolean; open?: boolean }) {
  const when = whenLine(p);
  return (
    <Link href={`/parties/${p.id}`} className="block">
      <Card className="transition hover:border-foreground/30 hover:shadow-md">
        <CardContent className="space-y-1.5 pt-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold leading-snug">{p.title}</h3>
            {p.status === "CANCELLED" ? (
              <Badge variant="outline" className="shrink-0 text-[10px] text-muted-foreground">Cancelled</Badge>
            ) : expired ? (
              <Badge variant="outline" className="shrink-0 text-[10px] text-muted-foreground">Expired</Badge>
            ) : myRsvp ? (
              <Badge variant="outline" className={`shrink-0 text-[10px] capitalize ${RSVP_TONE[myRsvp] ?? ""}`}>
                {myRsvp.toLowerCase()}
              </Badge>
            ) : open ? (
              <Badge variant="drink" className="shrink-0 text-[10px]">Open</Badge>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">📍 {venueLine(p)}</div>
          {when && <div className="text-xs text-muted-foreground">🗓 {when}</div>}
          <div className="text-[11px] text-muted-foreground/60">
            Hosted by @{p.author?.profile?.username ?? "someone"} · {p._count?.invites ?? 0} invited
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function PartiesView({ hosting, invited, open }: { hosting: Party[]; invited: Party[]; open: Party[] }) {
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<PartyTab>("open");
  const now = new Date();
  const activeInvites = invited.filter((p) => !isExpired(p, now));
  const expiredParties = [...invited, ...hosting].filter((p, index, all) => {
    return isExpired(p, now) && all.findIndex((other) => other.id === p.id) === index;
  });
  const tabs: { value: PartyTab; label: string; count: number }[] = [
    { value: "open", label: "Open", count: open.length },
    { value: "invited", label: "Invited to", count: activeInvites.length },
    { value: "expired", label: "Expired", count: expiredParties.length },
    { value: "created", label: "You created", count: hosting.length },
  ];
  const visible = tab === "open" ? open : tab === "invited" ? activeInvites : tab === "expired" ? expiredParties : hosting;
  const empty = emptyCopy(tab);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Parties</h1>
          <p className="text-sm text-muted-foreground">Round up your circle for a night out or a house party.</p>
        </div>
        <Button variant="gold" className="font-display" onClick={() => setCreating(true)}>
          Throw a party
        </Button>
      </header>

      {hosting.length === 0 && invited.length === 0 && open.length === 0 && (
        <EmptyState
          emoji="🎉"
          title="No parties yet"
          subtitle="Throw one, pick the drinks, and invite your circle. The night starts here."
          actionLabel="Throw a party"
          onAction={() => setCreating(true)}
        />
      )}

      {(hosting.length > 0 || invited.length > 0 || open.length > 0) && (
        <section className="space-y-3">
          <div
            role="tablist"
            aria-label="Party filters"
            className="grid grid-cols-4 gap-2 rounded-2xl border border-border/50 bg-card/40 p-1"
          >
            {tabs.map((item) => {
              const active = tab === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(item.value)}
                  className={`rounded-xl px-2 py-2 text-center text-xs font-semibold transition ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <span className="block truncate">{item.label}</span>
                  <span className="text-[10px] opacity-80">{item.count}</span>
                </button>
              );
            })}
          </div>

          {visible.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="space-y-1 py-8 text-center">
                <h2 className="font-display text-lg font-semibold">{empty.title}</h2>
                <p className="text-sm text-muted-foreground">{empty.subtitle}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {visible.map((p) => (
                <PartyCard
                  key={p.id}
                  p={p}
                  myRsvp={p.invites?.[0]?.rsvp}
                  expired={isExpired(p, now)}
                  open={tab === "open"}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {creating && <CreatePartyFlow onClose={() => setCreating(false)} />}
    </div>
  );
}
