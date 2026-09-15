"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const OCCASIONS = [
  { value: "HOUSE_PARTY", label: "🏠 House party" },
  { value: "CLUB_NIGHT", label: "🪩 Club night" },
  { value: "CELEBRATION", label: "🎉 Celebration" },
  { value: "CASUAL_HANGOUT", label: "🍻 Casual hangout" },
  { value: "WEEKEND_CHILL", label: "🌙 Weekend chill" },
];

type Bar = { id: string; name: string; city: string };

export function CreatePartyFlow({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [occasion, setOccasion] = useState<string | null>("HOUSE_PARTY");
  const [startsAt, setStartsAt] = useState("");
  const [venueMode, setVenueMode] = useState<"bar" | "house">("house");
  const [locationText, setLocationText] = useState("");
  const [barQuery, setBarQuery] = useState("");
  const [barResults, setBarResults] = useState<Bar[]>([]);
  const [selectedBar, setSelectedBar] = useState<Bar | null>(null);
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "CIRCLE">("CIRCLE");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Bar search (the endpoint is cached). Debounced.
  useEffect(() => {
    const t = setTimeout(() => {
      if (venueMode !== "bar" || barQuery.trim().length < 2) {
        setBarResults([]);
        return;
      }
      fetch(`/api/bars?q=${encodeURIComponent(barQuery.trim())}`)
        .then((r) => r.json())
        .then((d) => setBarResults((d.data ?? []).slice(0, 6)))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [barQuery, venueMode]);

  async function create() {
    if (!title.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/parties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          occasion,
          startsAt: startsAt || null,
          barId: venueMode === "bar" ? selectedBar?.id ?? null : null,
          locationText: venueMode === "house" ? locationText.trim() || null : null,
          description: description.trim() || null,
          visibility,
        }),
      });
      const j = await r.json();
      if (r.ok && j.data?.id) {
        router.push(`/parties/${j.data.id}`);
      } else {
        setErr(j.error ?? "Couldn't create the party.");
        setBusy(false);
      }
    } catch {
      setErr("Couldn't create the party.");
      setBusy(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
      >
        <motion.div
          key="sheet"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 28 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-border/60 bg-popover text-popover-foreground shadow-2xl sm:rounded-2xl"
        >
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5">
            <h2 className="font-display text-lg font-semibold">Throw a party</h2>
            <button onClick={onClose} aria-label="Close" className="rounded p-1 text-muted-foreground hover:text-foreground">✕</button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Friday at mine, Diwali pre-game…" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Occasion</label>
              <div className="flex flex-wrap gap-1.5">
                {OCCASIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setOccasion(o.value)}
                    aria-pressed={occasion === o.value}
                    className={
                      "rounded-full border px-3 py-1 text-xs transition " +
                      (occasion === o.value
                        ? "border-foreground bg-foreground text-background"
                        : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground")
                    }
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">When</label>
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Where</label>
              <div className="flex gap-1.5">
                {(["house", "bar"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setVenueMode(m)}
                    aria-pressed={venueMode === m}
                    className={
                      "flex-1 rounded-lg border px-3 py-1.5 text-xs transition " +
                      (venueMode === m ? "border-primary bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground")
                    }
                  >
                    {m === "house" ? "🏠 A place" : "🍸 A bar"}
                  </button>
                ))}
              </div>
              {venueMode === "house" ? (
                <Input value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="My place, HSR Layout…" />
              ) : selectedBar ? (
                <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
                  <span>{selectedBar.name}, {selectedBar.city}</span>
                  <button onClick={() => setSelectedBar(null)} className="text-xs text-muted-foreground hover:text-foreground">change</button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Input value={barQuery} onChange={(e) => setBarQuery(e.target.value)} placeholder="Search a bar…" />
                  {barResults.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => { setSelectedBar(b); setBarResults([]); }}
                      className="block w-full rounded-lg px-3 py-1.5 text-left text-sm hover:bg-muted/50"
                    >
                      {b.name} <span className="text-muted-foreground">· {b.city}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details (optional)</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="BYOB, dress code, what to bring…" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Who can find it?</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setVisibility("CIRCLE")} className={"rounded-xl border p-3 text-left text-xs transition " + (visibility === "CIRCLE" ? "border-primary bg-primary/10" : "border-border/60 text-muted-foreground")}>
                  <span className="block font-semibold text-foreground">Private invite</span>
                  Only people you invite
                </button>
                <button type="button" onClick={() => setVisibility("PUBLIC")} className={"rounded-xl border p-3 text-left text-xs transition " + (visibility === "PUBLIC" ? "border-primary bg-primary/10" : "border-border/60 text-muted-foreground")}>
                  <span className="block font-semibold text-foreground">Open party</span>
                  Discoverable while live or upcoming
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-border/50 px-5 py-3">
            {err && <p className="text-center text-sm text-destructive">{err}</p>}
            <Button variant="gold" className="w-full font-display" disabled={busy || !title.trim()} onClick={create}>
              {busy ? "Setting up…" : "Create party 🎉"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
