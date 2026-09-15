"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CasualHangoutIcon,
  CelebrationIcon,
  ClubNightIcon,
  HousePartyIcon,
  WeekendChillIcon,
} from "./occasion-icons";

// Each occasion carries its own neon hue, matching the stitch "What's the
// Occasion?" tiles. The hue is passed down as --tile-hue so .neon-tile lights
// up in that colour when picked; everything else still tracks the vibe theme.
const OCCASIONS = [
  { value: "HOUSE_PARTY", label: "House Party", hue: "#a855f7", Icon: HousePartyIcon },
  { value: "CLUB_NIGHT", label: "Club Night", hue: "#3b82f6", Icon: ClubNightIcon },
  { value: "CELEBRATION", label: "Celebration", hue: "#f59e0b", Icon: CelebrationIcon },
  { value: "CASUAL_HANGOUT", label: "Casual Hangout", hue: "#22c55e", Icon: CasualHangoutIcon },
  { value: "WEEKEND_CHILL", label: "Weekend Chill", hue: "#6366f1", Icon: WeekendChillIcon },
] as const;

type Bar = { id: string; name: string; city: string };
type Step = 0 | 1 | 2;

const STEP_LABELS = ["The occasion", "The place", "The invite"];

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="eyebrow block">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

export function CreatePartyFlow({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>(0);
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

  const activeOccasion = useMemo(
    () => OCCASIONS.find((o) => o.value === occasion) ?? null,
    [occasion],
  );

  const venueLine = venueMode === "bar"
    ? selectedBar
      ? `${selectedBar.name}, ${selectedBar.city}`
      : "Venue to be confirmed"
    : locationText.trim() || "Venue to be confirmed";

  const whenLine = startsAt
    ? new Date(startsAt).toLocaleString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Date to be confirmed";

  // Step 1 needs a name before you can move on; the rest is optional so the
  // flow never traps someone who just wants to get a party up fast.
  const canAdvance = step === 0 ? title.trim().length > 0 : true;

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
        // The detail page is where you invite your circle and stock the bar,
        // so creation hands straight off to it.
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
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-party-title"
          className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-border/60 bg-popover text-popover-foreground shadow-2xl sm:rounded-3xl"
        >
          {/* Header: step counter + segmented progress, per the stitch wizard */}
          <div className="space-y-3 border-b border-border/50 px-5 pb-3.5 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="eyebrow">
                  Step {step + 1} of 3 · {STEP_LABELS[step]}
                </p>
                <h2 id="create-party-title" className="section-title mt-0.5 truncate">
                  Throw a party
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 shrink-0 rounded-full p-1.5 text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="flex gap-1.5" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all duration-300",
                    i <= step
                      ? "bg-primary shadow-[0_0_8px_var(--primary)]"
                      : "bg-[color-mix(in_srgb,var(--foreground)_12%,transparent)]",
                  )}
                />
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {/* ------------------------------ STEP 1 */}
            {step === 0 && (
              <div className="space-y-5">
                <h3 className="screen-title text-balance">
                  Let&apos;s get this party started.
                </h3>

                <Field label="What's it called?">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Friday at mine, Diwali pre-game…"
                    className="h-11"
                    autoFocus
                  />
                </Field>

                <div className="space-y-2">
                  <span className="eyebrow block">What&apos;s the occasion?</span>
                  <div className="grid grid-cols-3 gap-2">
                    {OCCASIONS.map((o) => {
                      const on = occasion === o.value;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => setOccasion(o.value)}
                          aria-pressed={on}
                          data-on={on}
                          className="neon-tile min-h-24"
                          style={{ ["--tile-hue" as string]: o.hue }}
                        >
                          <o.Icon
                            className="h-7 w-7"
                            style={{ color: on ? o.hue : undefined }}
                          />
                          <span
                            className={cn(
                              "text-[11px] font-semibold leading-tight",
                              on ? "text-foreground" : "text-muted-foreground",
                            )}
                          >
                            {o.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Field label="When" hint="Leave it blank if you're still deciding.">
                  <Input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="h-11"
                  />
                </Field>
              </div>
            )}

            {/* ------------------------------ STEP 2 */}
            {step === 1 && (
              <div className="space-y-5">
                <h3 className="screen-title text-balance">Where&apos;s it happening?</h3>

                <div className="grid grid-cols-2 gap-2">
                  {(["house", "bar"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setVenueMode(m)}
                      aria-pressed={venueMode === m}
                      data-on={venueMode === m}
                      className="neon-tile min-h-20"
                    >
                      <span className="text-xl" aria-hidden>
                        {m === "house" ? "🏠" : "🍸"}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          venueMode === m ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {m === "house" ? "A place" : "A bar"}
                      </span>
                    </button>
                  ))}
                </div>

                {venueMode === "house" ? (
                  <Field label="Address or landmark">
                    <Input
                      value={locationText}
                      onChange={(e) => setLocationText(e.target.value)}
                      placeholder="My place, HSR Layout…"
                      className="h-11"
                    />
                  </Field>
                ) : selectedBar ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-3 text-sm">
                    <span className="truncate">
                      {selectedBar.name}, {selectedBar.city}
                    </span>
                    <button
                      onClick={() => setSelectedBar(null)}
                      className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                      change
                    </button>
                  </div>
                ) : (
                  <Field label="Which bar?">
                    <Input
                      value={barQuery}
                      onChange={(e) => setBarQuery(e.target.value)}
                      placeholder="Search a bar…"
                      className="h-11"
                    />
                    {barResults.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5 overflow-hidden rounded-xl border border-border/60">
                        {barResults.map((b) => (
                          <li key={b.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBar(b);
                                setBarResults([]);
                              }}
                              className="block w-full px-3.5 py-2.5 text-left text-sm transition hover:bg-muted/50"
                            >
                              {b.name}{" "}
                              <span className="text-muted-foreground">· {b.city}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Field>
                )}

                <Field label="Anything they should know?">
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="BYOB, dress code, what to bring…"
                    className="h-11"
                  />
                </Field>

                <div className="space-y-2">
                  <span className="eyebrow block">Who can find it?</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setVisibility("CIRCLE")}
                      aria-pressed={visibility === "CIRCLE"}
                      data-on={visibility === "CIRCLE"}
                      className="neon-tile !items-start !text-left"
                    >
                      <span className="text-xs font-semibold text-foreground">
                        Private invite
                      </span>
                      <span className="text-[11px] leading-snug text-muted-foreground">
                        Only people you invite
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibility("PUBLIC")}
                      aria-pressed={visibility === "PUBLIC"}
                      data-on={visibility === "PUBLIC"}
                      className="neon-tile !items-start !text-left"
                    >
                      <span className="text-xs font-semibold text-foreground">
                        Open party
                      </span>
                      <span className="text-[11px] leading-snug text-muted-foreground">
                        Discoverable while it&apos;s live
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------ STEP 3 — invitation preview */}
            {step === 2 && (
              <div className="space-y-5">
                <h3 className="screen-title text-balance">Here&apos;s the invite.</h3>

                <div
                  className="overflow-hidden rounded-2xl border"
                  style={{
                    borderColor: `color-mix(in srgb, ${activeOccasion?.hue ?? "var(--primary)"} 45%, transparent)`,
                    boxShadow: `0 0 26px color-mix(in srgb, ${activeOccasion?.hue ?? "var(--primary)"} 26%, transparent)`,
                  }}
                >
                  <div
                    className="flex flex-col items-center gap-3 px-5 py-8 text-center"
                    style={{
                      background: `radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, ${activeOccasion?.hue ?? "var(--primary)"} 26%, transparent) 0%, transparent 70%), var(--card)`,
                    }}
                  >
                    {activeOccasion && (
                      <activeOccasion.Icon
                        className="h-10 w-10"
                        style={{ color: activeOccasion.hue }}
                      />
                    )}
                    <p
                      className="eyebrow"
                      style={{ color: activeOccasion?.hue ?? "var(--primary)" }}
                    >
                      {activeOccasion?.label ?? "Party"}
                    </p>
                    <h4 className="screen-title text-balance text-foreground">
                      {title.trim() || "Your party"}
                    </h4>
                  </div>

                  <dl className="divide-y divide-border/50 bg-card px-5 text-sm">
                    <div className="flex justify-between gap-3 py-3">
                      <dt className="eyebrow">When</dt>
                      <dd className="text-right font-medium">{whenLine}</dd>
                    </div>
                    <div className="flex justify-between gap-3 py-3">
                      <dt className="eyebrow">Where</dt>
                      <dd className="truncate text-right font-medium">{venueLine}</dd>
                    </div>
                    <div className="flex justify-between gap-3 py-3">
                      <dt className="eyebrow">Who</dt>
                      <dd className="text-right font-medium">
                        {visibility === "PUBLIC" ? "Open party" : "Private invite"}
                      </dd>
                    </div>
                  </dl>

                  {description.trim() && (
                    <p className="border-t border-border/50 bg-card px-5 py-3 text-xs text-muted-foreground">
                      {description.trim()}
                    </p>
                  )}

                  <p className="border-t border-border/50 bg-card px-5 py-3 text-center font-display text-sm italic text-muted-foreground">
                    The story starts here.
                  </p>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  Create it, then invite your circle and stock the bar on the
                  party page.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="space-y-2 border-t border-border/50 px-5 py-3.5">
            {err && <p className="text-center text-sm text-destructive">{err}</p>}
            <div className="flex gap-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s - 1) as Step)}
                  className="min-h-12 shrink-0 rounded-full border border-border px-5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                >
                  Back
                </button>
              )}
              {step < 2 ? (
                <button
                  type="button"
                  disabled={!canAdvance}
                  onClick={() => setStep((s) => (s + 1) as Step)}
                  className="btn-neon min-h-12 flex-1 text-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy || !title.trim()}
                  onClick={create}
                  className="btn-neon min-h-12 flex-1 text-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {busy ? "Setting up…" : "Create party 🎉"}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
