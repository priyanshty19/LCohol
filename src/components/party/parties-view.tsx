"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreatePartyFlow } from "./create-party-flow";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Party = any;

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

function PartyCard({ p, myRsvp }: { p: Party; myRsvp?: string }) {
  const when = whenLine(p);
  return (
    <Link href={`/parties/${p.id}`} className="block">
      <Card className="transition hover:border-foreground/30 hover:shadow-md">
        <CardContent className="space-y-1.5 pt-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold leading-snug">{p.title}</h3>
            {p.status === "CANCELLED" ? (
              <Badge variant="outline" className="shrink-0 text-[10px] text-muted-foreground">Cancelled</Badge>
            ) : myRsvp ? (
              <Badge variant="outline" className={`shrink-0 text-[10px] capitalize ${RSVP_TONE[myRsvp] ?? ""}`}>
                {myRsvp.toLowerCase()}
              </Badge>
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

export function PartiesView({ hosting, invited }: { hosting: Party[]; invited: Party[] }) {
  const [creating, setCreating] = useState(false);

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

      {hosting.length === 0 && invited.length === 0 && (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          No parties yet. Throw one and invite your circle. 🎉
        </div>
      )}

      {invited.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">You&apos;re invited</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {invited.map((p) => (
              <PartyCard key={p.id} p={p} myRsvp={p.invites?.[0]?.rsvp} />
            ))}
          </div>
        </section>
      )}

      {hosting.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hosting</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {hosting.map((p) => (
              <PartyCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      {creating && <CreatePartyFlow onClose={() => setCreating(false)} />}
    </div>
  );
}
