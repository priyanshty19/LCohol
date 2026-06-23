import Link from "next/link";
import { notFound } from "next/navigation";
import { getPartyByCode } from "@/lib/parties";
import { getCurrentUser } from "@/lib/auth";
import { PartyInviteAccept } from "@/components/party/party-invite-accept";

export const dynamic = "force-dynamic";

export default async function PartyInvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const invite = await getPartyByCode(code);
  if (!invite) notFound();

  const party = invite.partyPlan;
  const me = await getCurrentUser();
  const expired = invite.expiresAt && new Date(invite.expiresAt) < new Date();
  const cancelled = party.status === "CANCELLED";
  const when = party.startsAt ?? party.eventDate;
  const venue = party.bar ? `${party.bar.name}, ${party.bar.city}` : party.locationText ?? "Venue TBA";
  const going = party.invites.length;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10">
      <div className="w-full space-y-5 rounded-2xl border border-border/60 bg-card/70 p-6 text-center shadow-2xl backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          @{party.author?.profile?.username ?? "Someone"} invited you to
        </p>
        <h1 className="font-display text-2xl font-bold text-primary">{party.title}</h1>
        <div className="space-y-1 text-sm text-muted-foreground">
          <div>📍 {venue}</div>
          {when && (
            <div>🗓 {new Date(when).toLocaleString(undefined, { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
          )}
          {going > 0 && <div>🍻 {going} going</div>}
        </div>
        {party.description && <p className="text-sm text-foreground/80">{party.description}</p>}

        <div className="pt-2">
          {cancelled ? (
            <p className="text-sm text-destructive">This party was cancelled.</p>
          ) : expired ? (
            <p className="text-sm text-muted-foreground">This invite has expired.</p>
          ) : me ? (
            <PartyInviteAccept code={code} />
          ) : (
            <div className="space-y-2">
              <Link href={`/login?ref=${encodeURIComponent(code)}`} className="block">
                <span className="btn-gold inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 font-display font-semibold text-primary-foreground">
                  Join SIPSTORIES to RSVP
                </span>
              </Link>
              <p className="text-[11px] text-muted-foreground/70">
                Sign up with code <span className="font-mono text-foreground">{code}</span> to join {party.author?.profile?.displayName ?? "the host"}&apos;s circle and you&apos;re in.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
