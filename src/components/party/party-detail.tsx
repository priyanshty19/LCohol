"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PartyDrinks, PartyGames } from "@/components/party/party-suggestions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Party = any;
type Member = { id: string; userId: string; username: string | null; displayName: string | null };

const OCCASION_LABELS: Record<string, string> = {
  HOUSE_PARTY: "House party",
  CLUB_NIGHT: "Club night",
  CELEBRATION: "Celebration",
  CASUAL_HANGOUT: "Casual hangout",
  WEEKEND_CHILL: "Weekend chill",
  DATE_NIGHT: "Date night",
  OUTDOOR_BBQ: "Outdoor BBQ",
  FESTIVAL: "Festival",
};
const RSVP_TONE: Record<string, string> = {
  GOING: "text-primary",
  MAYBE: "text-yellow-500",
  DECLINED: "text-muted-foreground/50",
  INVITED: "text-muted-foreground",
};

export function PartyDetail({ party, isHost, myRsvp, meId }: { party: Party; isHost: boolean; myRsvp: string | null; meId: string }) {
  const router = useRouter();
  const [rsvp, setRsvp] = useState<string | null>(myRsvp);
  const [invites, setInvites] = useState<Party["invites"]>(party.invites);
  const [busy, setBusy] = useState(false);

  const when = party.startsAt ?? party.eventDate;
  const venue = party.bar ? `${party.bar.name}, ${party.bar.city}` : party.locationText ?? "Venue TBA";
  const going = invites.filter((i: Party) => i.rsvp === "GOING");
  const canContribute = isHost || (rsvp != null && rsvp !== "DECLINED");

  async function setMyRsvp(status: string) {
    setRsvp(status);
    setBusy(true);
    try {
      await fetch(`/api/parties/${party.id}/rsvp`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } finally {
      setBusy(false);
    }
  }

  async function revokeInvite(inviteId: string) {
    // Optimistically remove the row. Freshly-invited rows carry a temporary id
    // (tmp-…) until a refresh assigns the real one — those aren't yet revocable by
    // id, so resync from the server instead of issuing a doomed DELETE.
    if (inviteId.startsWith("tmp-")) {
      router.refresh();
      return;
    }
    const prev = invites;
    setInvites((list: Party["invites"]) => list.filter((i: Party) => i.id !== inviteId));
    try {
      const r = await fetch(`/api/parties/${party.id}/invites`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });
      if (!r.ok) {
        setInvites(prev); // restore on failure
      }
    } catch {
      setInvites(prev);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{party.title}</h1>
          {party.status === "CANCELLED" && <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>}
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {party.occasion && <Badge variant="topic">{OCCASION_LABELS[party.occasion] ?? party.occasion}</Badge>}
          <span>📍 {venue}</span>
          {when && (
            <span>🗓 {new Date(when).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground/70">Hosted by @{party.author?.profile?.username ?? "someone"}</p>
        {party.description && <p className="text-sm leading-relaxed text-foreground/90">{party.description}</p>}
      </header>

      {/* Guest RSVP */}
      {!isHost && party.status !== "CANCELLED" && (
        <Card>
          <CardContent className="space-y-2 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your RSVP</p>
            <div className="flex gap-2">
              {[
                { v: "GOING", label: "Going 🍻" },
                { v: "MAYBE", label: "Maybe" },
                { v: "DECLINED", label: "Can't make it" },
              ].map((o) => (
                <motion.button
                  key={o.v}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  disabled={busy}
                  onClick={() => setMyRsvp(o.v)}
                  className={
                    "flex-1 rounded-lg border px-3 py-2 text-sm transition " +
                    (rsvp === o.v ? "border-primary bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground hover:text-foreground")
                  }
                >
                  {o.label}
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Host invite controls */}
      {isHost && party.status !== "CANCELLED" && (
        <HostControls
          partyId={party.id}
          onInvited={(newInvites) => setInvites((prev: Party["invites"]) => [...prev, ...newInvites])}
          onCancel={() => router.refresh()}
        />
      )}

      {/* Member suggestions — drinks & games (any member can contribute) */}
      {party.status !== "CANCELLED" && canContribute && (
        <>
          <PartyDrinks
            partyId={party.id}
            meId={meId}
            isHost={isHost}
            initial={party.drinkSuggestions ?? []}
          />
          <PartyGames
            partyId={party.id}
            meId={meId}
            isHost={isHost}
            initial={party.gameSuggestions ?? []}
          />
        </>
      )}

      {/* Guest list */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Guests · {going.length} going
        </h2>
        {invites.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">No one invited yet.</p>
        ) : (
          <div className="space-y-1.5">
            {invites.map((i: Party, idx: number) => {
              const name = i.invitedUser?.profile?.displayName ?? i.invitedUser?.profile?.username ?? "Invited";
              return (
                <motion.div
                  key={i.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 8) * 0.03 }}
                  className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                    {(name[0] ?? "?").toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{i.invitedUser ? name : "Invite link"}</span>
                  <span className={`text-xs capitalize ${RSVP_TONE[i.rsvp] ?? ""}`}>{i.rsvp.toLowerCase()}</span>
                  {isHost && party.status !== "CANCELLED" && (
                    <button
                      type="button"
                      onClick={() => revokeInvite(i.id)}
                      aria-label={`Remove ${i.invitedUser ? name : "invite link"}`}
                      title="Remove"
                      className="shrink-0 rounded p-1 text-muted-foreground/50 transition hover:bg-destructive/10 hover:text-destructive"
                    >
                      ✕
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// Clipboard writes reject on insecure origins (and in browsers that gate the
// async API), so fall back to a hidden textarea + execCommand before giving up.
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function HostControls({
  partyId,
  onInvited,
  onCancel,
}: {
  partyId: string;
  onInvited: (invites: { id: string; rsvp: string; invitedUserId: string; invitedUser: { profile: { username: string | null; displayName: string | null } } }[]) => void;
  onCancel: () => void;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  // Split feedback: a success line (role="status") and an error line (role="alert")
  // so an invite/copy never fails silently.
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/connections")
      .then((r) => r.json())
      .then((d) => setMembers(Array.isArray(d) ? d : d.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    setError(null);
  }

  function flashCopied() {
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  }

  async function sendInvites() {
    if (!selected.size || busy) return;
    setBusy(true);
    setNote(null);
    setError(null);
    try {
      const r = await fetch(`/api/parties/${partyId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [...selected] }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j.error ?? "Couldn't send the invites. Try again.");
        return;
      }
      const invited: number = typeof j.data?.invited === "number" ? j.data.invited : 0;
      if (invited === 0) {
        setNote("Everyone you picked was already invited.");
        setSelected(new Set());
        return;
      }
      const picked = members.filter((m) => selected.has(m.userId));
      onInvited(
        picked.map((m) => ({
          id: `tmp-${m.userId}`,
          rsvp: "INVITED",
          invitedUserId: m.userId,
          invitedUser: { profile: { username: m.username, displayName: m.displayName } },
        }))
      );
      setSelected(new Set());
      setNote(invited === 1 ? "Invite sent." : `${invited} invites sent.`);
    } catch {
      setError("Couldn't send the invites. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  // "Copy invite link" mints a link the first time, then copies it. Reuse the
  // already-minted link on repeat clicks so we don't burn through the link quota.
  async function copyInviteLink() {
    if (busy) return;
    setBusy(true);
    setNote(null);
    setError(null);
    try {
      let url = link;
      if (!url) {
        const r = await fetch(`/api/parties/${partyId}/invites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generateLink: true }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.data?.code) {
          setError(j.error ?? "Couldn't create an invite link.");
          return;
        }
        url = `${window.location.origin}/party/${j.data.code}`;
        setLink(url);
      }
      if (await copyToClipboard(url)) {
        flashCopied();
        setNote("Invite link copied.");
      } else {
        setError("Couldn't copy automatically — select the link below and copy it.");
      }
    } catch {
      setError("Couldn't create an invite link. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copyExistingLink() {
    if (!link) return;
    setError(null);
    if (await copyToClipboard(link)) {
      flashCopied();
      setNote("Invite link copied.");
    } else {
      setError("Couldn't copy automatically — select the link above and copy it.");
    }
  }

  async function cancelParty() {
    if (!confirm("Cancel this party? Guests keep the record but it's marked cancelled.")) return;
    await fetch(`/api/parties/${partyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    onCancel();
  }

  const nothingSelected = selected.size === 0;
  // Why the Invite button is disabled, said out loud (and wired up via
  // aria-describedby) instead of leaving a dead-looking button.
  const inviteHint = members.length === 0
    ? "Your circle is empty — use a link below for anyone."
    : nothingSelected
      ? "Pick at least one person to enable Invite."
      : null;

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invite your circle</p>
        {members.length > 0 && (
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {members.map((m) => {
              const name = m.displayName ?? m.username ?? "Member";
              const on = selected.has(m.userId);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m.userId)}
                  aria-pressed={on}
                  className={"flex w-full items-center gap-2.5 rounded-lg border px-3 py-1.5 text-left text-sm transition " + (on ? "border-primary bg-primary/10" : "border-border/50 hover:bg-muted/40")}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">{(name[0] ?? "?").toUpperCase()}</span>
                  <span className="min-w-0 flex-1 truncate">{name}</span>
                  <span className={"h-4 w-4 rounded-full border " + (on ? "border-primary bg-primary" : "border-border")} />
                </button>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="gold"
            size="sm"
            disabled={busy || nothingSelected}
            aria-describedby={inviteHint ? "invite-hint" : undefined}
            onClick={sendInvites}
          >
            {selected.size > 0 ? `Invite ${selected.size}` : "Invite"}
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={copyInviteLink}>
            {copied ? "Copied!" : "Copy invite link"}
          </Button>
          <Button variant="ghost" size="sm" className="ml-auto text-destructive" onClick={cancelParty}>
            Cancel party
          </Button>
        </div>
        {inviteHint && (
          <p id="invite-hint" className="text-xs text-muted-foreground">
            {inviteHint}
          </p>
        )}
        <p role="status" aria-live="polite" className="text-xs text-primary empty:hidden">
          {note}
        </p>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        {link && (
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
            <label htmlFor="party-invite-link" className="sr-only">
              Invite link
            </label>
            <input
              id="party-invite-link"
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 bg-transparent text-xs text-muted-foreground outline-none"
            />
            <button
              type="button"
              onClick={copyExistingLink}
              className="shrink-0 text-xs font-medium text-primary"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
