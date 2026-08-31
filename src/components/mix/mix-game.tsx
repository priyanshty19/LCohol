"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { colorFor } from "@/lib/mix-colors";
import { toast } from "@/lib/toast";
import { compressImage } from "@/lib/image-compress";
import { GLASS_LIST, GLASSES, type GlassDef, type GlassId } from "@/lib/glassware";
import { GARNISHES, type GarnishId } from "@/lib/garnishes";
import { CssVessel, hasWebGL, type Layer } from "./mix-vessel";

const MixVesselScene = dynamic(() => import("./mix-vessel-scene").then((m) => m.MixVesselScene), { ssr: false });

type IngredientOption = { name: string; slug: string; category: string };
type Step = "glass" | "build" | "garnish";
const CATEGORY_TABS = ["SPIRIT", "MIXER", "JUICE", "SYRUP", "BITTERS", "GARNISH", "ICE", "OTHER"];

// Build an SVG silhouette path from a glass's [r,y] wall profile (right side up,
// mirrored down the left) so the picker shows the real shape, not a generic icon.
function glassSilhouette(g: GlassDef, w: number, h: number): string {
  const maxY = g.rimY;
  const maxR = Math.max(...g.wall.map((p) => p[0]));
  const pad = 4;
  const sx = (w - pad * 2) / (maxR * 2);
  const sy = (h - pad * 2) / maxY;
  const s = Math.min(sx, sy);
  const cx = w / 2;
  const X = (r: number) => cx + r * s;
  const Y = (y: number) => h - pad - y * s;
  const right = g.wall.map(([r, y]) => `${X(r).toFixed(1)},${Y(y).toFixed(1)}`);
  const left = [...g.wall].reverse().map(([r, y]) => `${X(-r).toFixed(1)},${Y(y).toFixed(1)}`);
  return `M ${right.concat(left).join(" L ")} Z`;
}

export function MixGame() {
  const [step, setStep] = useState<Step>("glass");
  const [glassId, setGlassId] = useState<GlassId | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [mixed, setMixed] = useState(false);
  const [garnish, setGarnish] = useState<GarnishId | null>(null);
  const [iceCount, setIceCount] = useState(0); // ice is a count, not a liquid layer — each click adds a cube
  const [iceSlug, setIceSlug] = useState<string | null>(null);
  const [pourKey, setPourKey] = useState(0); // increments on each add → triggers a pour splash

  const [palette, setPalette] = useState<IngredientOption[]>([]);
  const [activeCat, setActiveCat] = useState("SPIRIT");
  const [query, setQuery] = useState("");

  const [webgl, setWebgl] = useState(true);
  const [inView, setInView] = useState(true);
  const [hidden, setHidden] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  // save
  const [mixName, setMixName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // share the saved mix to the feed (PUBLIC or CIRCLE post linking the cocktail)
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState<"PUBLIC" | "CIRCLE" | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setWebgl(hasWebGL()));
    // Pre-warm the WebGL scene chunk while the user reads the glass picker, so
    // picking a glass mounts the 3D instantly (no load hitch).
    void import("./mix-vessel-scene");
    fetch("/api/ingredients")
      .then((r) => r.json())
      .then((d) => setPalette(d.data?.ingredients ?? []))
      .catch(() => {});
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.05 });
    if (stageRef.current) io.observe(stageRef.current);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVis);
      io.disconnect();
    };
  }, []);

  const glass = glassId ? GLASSES[glassId] : null;
  const rippleOn = inView && !hidden;
  const layerSlugs = useMemo(() => new Set(layers.map((l) => l.slug)), [layers]);

  const filteredPalette = useMemo(() => {
    const q = query.trim().toLowerCase();
    return palette.filter((o) => (q ? o.name.toLowerCase().includes(q) : o.category === activeCat)).slice(0, 60);
  }, [palette, activeCat, query]);

  function addLayer(o: IngredientOption) {
    if (mixed) return;
    // Ice isn't a liquid layer — each click stacks another cube (up to 6).
    if (o.category?.toUpperCase() === "ICE") {
      setIceCount((c) => Math.min(6, c + 1));
      setIceSlug(o.slug);
      setPourKey((k) => k + 1);
      return;
    }
    if (layerSlugs.has(o.slug) || layers.length >= 8) return;
    setLayers((prev) => [...prev, { slug: o.slug, name: o.name, category: o.category }]);
    setPourKey((k) => k + 1);
  }
  function removeLayer(slug: string) {
    if (mixed) return;
    setLayers((prev) => prev.filter((l) => l.slug !== slug));
  }
  function reset() {
    setStep("glass");
    setGlassId(null);
    setLayers([]);
    setMixed(false);
    setGarnish(null);
    setIceCount(0);
    setIceSlug(null);
    setMixName("");
    setSavedSlug(null);
    setSaveError(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(null);
    setPhotoPreview(null);
    setShared(null);
    setShareError(null);
  }

  async function saveMix() {
    if (!mixName.trim() || !layers.length || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      let imageUrl: string | null = null;
      if (photo) {
        const compressed = await compressImage(photo, { maxEdge: 1400, quality: 0.78 });
        const form = new FormData();
        form.append("file", compressed, "mix-photo.jpg");
        form.append("scope", "mixes");
        const upload = await fetch("/api/upload", { method: "POST", body: form });
        const uploaded = await upload.json().catch(() => ({}));
        if (!upload.ok || !uploaded.url) throw new Error(uploaded.error ?? "Photo upload failed");
        imageUrl = uploaded.url;
      }
      const r = await fetch("/api/cocktails/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: mixName.trim(),
          ingredientSlugs: [
            ...layers.map((l) => l.slug),
            ...(iceCount > 0 && iceSlug ? [iceSlug] : []),
          ],
          glass: glass?.name,
          garnish: garnish ? GARNISHES.find((g) => g.id === garnish)?.label : undefined,
          imageUrl,
        }),
      });
      const j = await r.json();
      if (r.ok && j.data) {
        setSavedSlug(j.data.slug);
        toast.success("Saved to your mixes 🥂");
      } else {
        setSaveError(j.error ?? "Couldn't save");
        toast.error(j.error ?? "Couldn't save");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Couldn't save";
      setSaveError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function shareMix(visibility: "PUBLIC" | "CIRCLE") {
    if (!savedSlug || sharing) return;
    setSharing(true);
    setShareError(null);
    try {
      const ingredientList = layers.map((l) => l.name).join(", ");
      const r = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `🍸 I mixed "${mixName.trim()}" in the Mix Lab`,
          body: `${ingredientList}${glass ? ` · served in a ${glass.name}` : ""}\n\nTry it or remix it: /cocktails/${savedSlug}`,
          postType: "RECOMMENDATION",
          visibility,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        setShared(visibility);
        toast.success(`Shared with ${visibility === "CIRCLE" ? "your circle" : "everyone"} 🥂`);
      } else {
        setShareError(j.error ?? "Couldn't share");
        toast.error(j.error ?? "Couldn't share");
      }
    } catch {
      setShareError("Couldn't share");
      toast.error("Couldn't share");
    } finally {
      setSharing(false);
    }
  }

  // ── Glass selection ────────────────────────────────────────────────────────
  if (step === "glass" || !glass) {
    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <h2 className="font-display text-xl font-semibold">Pick your glass</h2>
          <p className="text-sm text-muted-foreground">Every great drink starts with the right vessel.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {GLASS_LIST.map((g, i) => (
            <motion.button
              key={g.id}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
              whileHover={{ y: -3, scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setGlassId(g.id);
                setStep("build");
              }}
              className="group flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-muted/20 p-4 text-center transition hover:border-primary/50 hover:bg-primary/5"
            >
              <svg width="64" height="80" viewBox="0 0 64 80" className="text-primary/70 transition group-hover:text-primary">
                <path d={glassSilhouette(g, 64, 80)} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              <span className="font-display text-sm font-semibold">{g.name}</span>
              <span className="text-[11px] leading-tight text-muted-foreground">{g.blurb}</span>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  // ── Stage (3D) shared by build + garnish ───────────────────────────────────
  const stage = (
    <div ref={stageRef} className="relative mx-auto aspect-[4/5] w-full max-w-[340px]">
      {webgl ? (
        <MixVesselScene glass={glass} layers={layers} mixed={mixed} garnish={garnish} rippleOn={rippleOn} pourKey={pourKey} iceCount={iceCount} />
      ) : (
        <CssVessel layers={layers} />
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Stepper — must wrap, or the steps + glass label overflow narrow phones
          and force the whole page horizontally scrollable. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {[
          { k: "glass", n: "1 · Glass" },
          { k: "build", n: "2 · Build" },
          { k: "garnish", n: "3 · Garnish" },
        ].map((s, i) => (
          <span key={s.k} className="flex items-center gap-2">
            {i > 0 && <span className="text-muted-foreground/40">→</span>}
            <button
              type="button"
              aria-current={step === s.k ? "step" : undefined}
              onClick={() => {
                if (s.k === "glass") reset();
                if (s.k === "build" && step === "garnish") setStep("build");
              }}
              className={`rounded-full px-2.5 py-1 ${step === s.k ? "bg-primary/15 font-semibold text-primary" : "hover:text-foreground"}`}
            >
              {s.n}
            </button>
          </span>
        ))}
        <span className="ml-auto font-medium text-foreground">{glass.name} glass</span>
      </div>

      {/* grid-cols-1 is required: without it the mobile grid falls back to an
          auto (max-content) column that sizes to the 340px stage and overflows
          narrow phones. minmax(0,…) on lg keeps the stage column from blowing out. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Stage + layer chips */}
        <div className="space-y-3">
          <div className="glass-panel rounded-xl p-4">{stage}</div>
          {(layers.length > 0 || iceCount > 0) && (
            <div className="flex flex-wrap justify-center gap-1.5">
              {layers.map((l) => (
                <button
                  key={l.slug}
                  type="button"
                  onClick={() => removeLayer(l.slug)}
                  disabled={mixed}
                  title={mixed ? l.name : `Remove ${l.name}`}
                  className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground transition enabled:hover:border-destructive/50 enabled:hover:text-foreground disabled:opacity-70"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorFor(l.category, l.slug, l.name) }} />
                  {l.name}
                  {!mixed && <span className="text-muted-foreground/50">✕</span>}
                </button>
              ))}
              {iceCount > 0 && (
                <button
                  type="button"
                  onClick={() => !mixed && setIceCount((c) => Math.max(0, c - 1))}
                  disabled={mixed}
                  aria-label={`Ice, ${iceCount} ${iceCount === 1 ? "cube" : "cubes"}${mixed ? "" : " — remove one"}`}
                  title={mixed ? "Ice" : "Remove an ice cube"}
                  className="inline-flex items-center gap-1 rounded-full border border-sky-400/40 bg-sky-400/10 px-2 py-0.5 text-[11px] text-muted-foreground transition enabled:hover:border-destructive/50 enabled:hover:text-foreground disabled:opacity-70"
                >
                  <span aria-hidden>🧊</span> Ice ×{iceCount}
                  {!mixed && <span aria-hidden className="text-muted-foreground/50">✕</span>}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right rail — changes by step */}
        <div className="space-y-4">
         <AnimatePresence mode="wait">
          <motion.div
            key={`${step}-${mixed}`}
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          >
          {step === "build" && !mixed && (
            <div className="glass-panel space-y-3 rounded-xl p-4">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Add ingredients</h3>
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the shelf…" />
              {!query && (
                // Category tabs are a filter control, not selectable ingredients —
                // render them as a segmented strip (grouped tray, uppercase, squared
                // tabs) so they read distinctly from the rounded ingredient chips below.
                <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)] p-1">
                  {CATEGORY_TABS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setActiveCat(c)}
                      aria-pressed={activeCat === c}
                      className={`rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                        activeCat === c
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {c.toLowerCase()}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex max-h-72 flex-wrap gap-1.5 overflow-y-auto">
                {filteredPalette.map((o) => {
                  // Ice is capped separately (6 cubes) and never enters `layers`, so the
                  // 8-liquid-layer cap must not block ice chips.
                  const isIce = o.category?.toUpperCase() === "ICE";
                  const on = !isIce && layerSlugs.has(o.slug);
                  const capped = isIce ? iceCount >= 6 : layers.length >= 8;
                  return (
                    <button
                      key={o.slug}
                      onClick={() => addLayer(o)}
                      disabled={on || capped}
                      className={`min-h-9 rounded-full px-3 text-xs ${on ? "pill-active opacity-60" : "pill-inactive"}`}
                    >
                      {o.name}
                      {on && <span> ✓</span>}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">{layers.length}/8 added · they sit in layers until you mix.</p>
              {iceCount > 0 && layers.length === 0 && (
                <p className="text-[11px] text-[var(--ml-velvet-hover)]">Add a liquid to mix — ice alone isn&apos;t a drink.</p>
              )}
              <Button
                variant="gold"
                className="w-full"
                disabled={layers.length === 0}
                title={layers.length === 0 ? "Add at least one liquid ingredient" : undefined}
                onClick={() => setMixed(true)}
              >
                🍸 Mix it!
              </Button>
            </div>
          )}

          {step === "build" && mixed && (
            <div className="glass-panel space-y-3 rounded-xl p-4">
              <h3 className="font-display text-sm font-semibold">Mixed!</h3>
              <p className="text-sm text-muted-foreground">Your drink is blended. Dress it up with a garnish.</p>
              <Button variant="gold" className="w-full" onClick={() => setStep("garnish")}>
                Garnish your drink →
              </Button>
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setMixed(false)}>
                Un-mix &amp; tweak
              </Button>
            </div>
          )}

          {step === "garnish" && (
            <div className="glass-panel space-y-3 rounded-xl p-4">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Garnish</h3>
              <div className="grid grid-cols-3 gap-2">
                {GARNISHES.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => { setGarnish(garnish === g.id ? null : g.id); setSavedSlug(null); }}
                    aria-pressed={garnish === g.id}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-[11px] transition ${garnish === g.id ? "border-primary bg-primary/10 text-foreground" : "border-border/50 text-muted-foreground hover:border-foreground/30"}`}
                  >
                    <span className="text-xl" aria-hidden>{g.emoji}</span>
                    {g.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2 border-t border-border/40 pt-3">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground" htmlFor="mix-photo">
                    Drink photo <span className="font-normal opacity-70">(optional)</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted/30">
                      {photoPreview ? (
                        <Image src={photoPreview} alt="Selected drink" fill sizes="64px" className="object-cover" unoptimized />
                      ) : (
                        <div className="flex h-full items-center justify-center text-2xl" aria-hidden>🍸</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Input
                        id="mix-photo"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => {
                          const next = event.target.files?.[0] ?? null;
                          if (photoPreview) URL.revokeObjectURL(photoPreview);
                          setPhoto(next);
                          setPhotoPreview(next ? URL.createObjectURL(next) : null);
                          setSavedSlug(null);
                        }}
                        className="text-xs file:mr-2 file:border-0 file:bg-transparent file:text-xs file:font-semibold"
                      />
                      <p className="mt-1 text-[10px] text-muted-foreground/70">Compressed before upload to save space. A Sip Stories artwork is used if you skip it.</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input value={mixName} onChange={(e) => { setMixName(e.target.value); setSavedSlug(null); }} placeholder="Name your drink…" maxLength={200} />
                  <Button variant="gold" disabled={saving || !mixName.trim()} onClick={saveMix}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </div>
                {saveError && <p className="text-xs text-destructive">{saveError}</p>}
                {savedSlug && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 340, damping: 18 }}
                    className="space-y-2"
                  >
                    <p className="text-xs text-[var(--ml-sober)]">
                      🥂 Saved to your mixes.{" "}
                      <Link href={`/cocktails/${savedSlug}`} className="underline underline-offset-2">View it →</Link>
                    </p>
                    {shared ? (
                      <p className="text-xs text-[var(--ml-sober)]">
                        📣 Shared {shared === "CIRCLE" ? "with your circle" : "with everyone"}.{" "}
                        <Link href="/" className="underline underline-offset-2">See the feed →</Link>
                      </p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">Share it:</span>
                        <Button variant="outline" size="sm" disabled={sharing} onClick={() => shareMix("PUBLIC")}>
                          🌍 Everyone
                        </Button>
                        <Button variant="outline" size="sm" disabled={sharing} onClick={() => shareMix("CIRCLE")}>
                          🫂 My circle
                        </Button>
                      </div>
                    )}
                    {shareError && <p className="text-xs text-destructive">{shareError}</p>}
                  </motion.div>
                )}
                <Button variant="ghost" size="sm" className="w-full" onClick={reset}>
                  Start a new drink
                </Button>
              </div>
            </div>
          )}
          </motion.div>
         </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
