"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CreatePartyFlow } from "./create-party-flow";
import { PartyEmptyArt } from "./party-empty-art";
import { cn } from "@/lib/utils";

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
      title: "No open parties right now.",
      subtitle: "The night is young — why not host your own?",
    };
  }
  if (tab === "expired") {
    return {
      title: "Nothing has wound down yet.",
      subtitle: "Past plans will settle here once their date has passed.",
    };
  }
  if (tab === "created") {
    return {
      title: "You haven't thrown one yet.",
      subtitle: "Pick the occasion, stock the bar, invite your circle.",
    };
  }
  return {
    title: "No invites on the table.",
    subtitle: "Party invites you can still make will show up here.",
  };
}

function PartyCard({ p, myRsvp, expired, open }: { p: Party; myRsvp?: string; expired?: boolean; open?: boolean }) {
  const when = whenLine(p);
  const invited = p._count?.invites ?? 0;
  return (
    <Link href={`/parties/${p.id}`} className="group block">
      {/* Stitch party card: a lit left rail marks a live/open party, the title
          carries the serif display face, and the meta collapses to one line so
          four cards still scan at a glance on a phone. */}
      <article className="media-card h-full p-4">
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-0 w-[3px] transition-opacity",
            expired || p.status === "CANCELLED"
              ? "bg-muted-foreground/25"
              : "bg-primary shadow-[0_0_12px_var(--primary)]"
          )}
        />
        <div className="flex items-start justify-between gap-2 pl-2">
          <h3 className="section-title text-base text-foreground transition-colors group-hover:text-primary">
            {p.title}
          </h3>
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

        <dl className="mt-2.5 space-y-1 pl-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span aria-hidden>📍</span>
            <dd className="truncate">{venueLine(p)}</dd>
          </div>
          {when && (
            <div className="flex items-center gap-1.5">
              <span aria-hidden>🗓</span>
              <dd>{when}</dd>
            </div>
          )}
        </dl>

        <p className="mt-3 pl-2 text-[11px] text-muted-foreground/60">
          Hosted by @{p.author?.profile?.username ?? "someone"}
          {invited > 0 && ` · ${invited} invited`}
        </p>
      </article>
    </Link>
  );
}

function PartiesEmpty({
  title,
  subtitle,
  onThrow,
}: {
  title: string;
  subtitle: string;
  onThrow: () => void;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-6 text-center sm:py-10">
      <PartyEmptyArt className="w-full max-w-xs text-foreground sm:max-w-sm" />
      <h2 className="screen-title mt-6 max-w-sm text-balance text-foreground">
        {title}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{subtitle}</p>
      <button
        type="button"
        onClick={onThrow}
        className="btn-neon mt-7 min-h-12 w-full max-w-sm px-6 text-sm"
      >
        Throw a party
      </button>
    </div>
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
    { value: "invited", label: "Invited", count: activeInvites.length },
    { value: "expired", label: "Expired", count: expiredParties.length },
    { value: "created", label: "Yours", count: hosting.length },
  ];
  const visible = tab === "open" ? open : tab === "invited" ? activeInvites : tab === "expired" ? expiredParties : hosting;
  const empty = emptyCopy(tab);
  const nothingAnywhere = hosting.length === 0 && invited.length === 0 && open.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="screen-title text-foreground">Parties</h1>
          <p className="text-sm text-muted-foreground">
            Round up your circle for a night out or a house party.
          </p>
        </div>
        {/* On a phone the CTA lives in the empty state / below the list, so the
            header button is desktop-only and never competes with it. */}
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="btn-neon hidden min-h-10 px-5 text-sm sm:inline-flex sm:items-center"
        >
          Throw a party
        </button>
      </header>

      {nothingAnywhere ? (
        <PartiesEmpty
          title="No open parties right now."
          subtitle="The night is young — why not host your own?"
          onThrow={() => setCreating(true)}
        />
      ) : (
        <section className="space-y-4">
          <div
            role="tablist"
            aria-label="Party filters"
            className="rail"
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
                  className={cn("chip rail-item min-h-9", active ? "chip-on" : "chip-off")}
                >
                  {item.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] font-semibold",
                      active
                        ? "bg-[color-mix(in_srgb,var(--primary-foreground)_22%,transparent)]"
                        : "bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]"
                    )}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>

          {visible.length === 0 ? (
            <PartiesEmpty
              title={empty.title}
              subtitle={empty.subtitle}
              onThrow={() => setCreating(true)}
            />
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
