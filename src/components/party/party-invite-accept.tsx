"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// Signed-in guest accepting a party link: connect to the host + RSVP GOING.
export function PartyInviteAccept({ code }: { code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/party/${code}/accept`, { method: "POST" });
      const j = await r.json();
      if (r.ok && j.data?.partyId) {
        router.push(`/parties/${j.data.partyId}`);
      } else {
        setErr(j.error ?? "Couldn't RSVP. Try again.");
        setBusy(false);
      }
    } catch {
      setErr("Couldn't RSVP. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="gold" className="w-full font-display" disabled={busy} onClick={accept}>
        {busy ? "Joining…" : "I'm in 🍻"}
      </Button>
      {err && <p className="text-sm text-destructive">{err}</p>}
    </div>
  );
}
