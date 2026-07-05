"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { CardListSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const BarsMap = dynamic(() => import("./bars-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0c0d12] text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

type Bar = {
  id: string;
  name: string;
  slug: string;
  type: string;
  city: string;
  address: string | null;
  lat: number;
  lng: number;
  priceRange: string | null;
  rating: number | string | null;
  bestsellers: string[];
  description: string | null;
  external?: boolean;
};

const CITIES = ["Delhi NCR", "Bangalore", "Pune", "Hyderabad", "Chandigarh"];
const TYPES = ["PUB", "BAR", "BREWERY", "LOUNGE", "CLUB", "BYOB"];
const CITY_CENTER: Record<string, [number, number]> = {
  "Delhi NCR": [28.55, 77.15],
  Bangalore: [12.97, 77.61],
  Pune: [18.53, 73.86],
  Hyderabad: [17.43, 78.4],
  Chandigarh: [30.73, 76.78],
};

function priceTier(p: string | null) {
  const i = ["BUDGET", "MID_RANGE", "PREMIUM", "LUXURY"].indexOf(p ?? "");
  return i >= 0 ? "₹".repeat(i + 1) : "";
}

function BarCard({
  b,
  active,
  onSelect,
  onAskJames,
}: {
  b: Bar;
  active: boolean;
  onSelect: () => void;
  onAskJames: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "glass-panel cursor-pointer rounded-xl p-3 transition-[border-color,box-shadow]",
        active ? "glow-active" : "hover:border-primary/20"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="block truncate font-display text-base font-medium">
            {b.name}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {b.address}
          </span>
        </div>
        <div className="shrink-0 text-right">
          {b.rating != null && (
            <div className="text-sm font-semibold text-primary">
              ★ {Number(b.rating).toFixed(1)}
            </div>
          )}
          <div className="text-[11px] text-muted-foreground">
            {priceTier(b.priceRange)}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant="drink">{b.type}</Badge>
        {b.bestsellers?.slice(0, 3).map((d) => (
          <Badge key={d} variant="topic">
            {d}
          </Badge>
        ))}
      </div>

      {active && (
        <div className="mt-3 space-y-2">
          {b.description && (
            <p className="text-sm text-muted-foreground">{b.description}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <Button size="xs" variant="glass">
                Directions
              </Button>
            </a>
            <Button
              size="xs"
              variant="velvet"
              onClick={(e) => {
                e.stopPropagation();
                onAskJames();
              }}
            >
              Ask James
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function BarsView({ initialBars }: { initialBars: Bar[] }) {
  const [city, setCity] = useState("Delhi NCR");
  const [type, setType] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [bars, setBars] = useState<Bar[]>(initialBars); // seeded from server
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Nearby (Google Places) mode — real bars around the user's location.
  const [nearby, setNearby] = useState(false);
  const [locating, setLocating] = useState(false);
  const [nearbyMsg, setNearbyMsg] = useState<string | null>(null);
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  // StrictMode-safe mount guard (see cocktails-view): skip while unchanged.
  const initialSig = useRef(`${city}|${type}|${q}`);

  useEffect(() => {
    if (nearby) return; // nearby results override the curated city list
    const sig = `${city}|${type}|${q}`;
    if (sig === initialSig.current) return; // unchanged from server render
    setLoading(true);
    const params = new URLSearchParams({ city });
    if (type) params.set("type", type);
    if (q) params.set("q", q);
    fetch(`/api/bars?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setBars(d.data ?? []);
        setSelected(null);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, type, q]);

  function fetchCity() {
    setLoading(true);
    const params = new URLSearchParams({ city });
    if (type) params.set("type", type);
    if (q) params.set("q", q);
    fetch(`/api/bars?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => { setBars(d.data ?? []); setSelected(null); })
      .finally(() => setLoading(false));
  }

  function nearMe() {
    if (!("geolocation" in navigator)) {
      setNearbyMsg("Your browser can't share location.");
      return;
    }
    setLocating(true);
    setNearbyMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLoc([latitude, longitude]);
        fetch(`/api/bars/nearby?lat=${latitude}&lng=${longitude}&radius=3000`)
          .then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
          .then(({ ok, body }) => {
            if (!ok) {
              setNearbyMsg(body.error ?? "Couldn't fetch nearby bars.");
              return;
            }
            setNearby(true);
            setBars(body.data ?? []);
            setSelected(null);
            if (!body.data?.length) setNearbyMsg("No bars found within ~3 km.");
          })
          .catch(() => setNearbyMsg("Couldn't fetch nearby bars."))
          .finally(() => setLocating(false));
      },
      () => {
        setLocating(false);
        setNearbyMsg("Location permission denied — showing city bars instead.");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  }

  function exitNearby() {
    setNearby(false);
    setUserLoc(null);
    setNearbyMsg(null);
    fetchCity(); // restore curated city bars
  }

  function askJames(b: Bar) {
    window.dispatchEvent(
      new CustomEvent("ask-james", {
        detail: {
          prompt: `Tell me about ${b.name} in ${b.city} — what should I order there?`,
        },
      })
    );
  }

  const center: [number, number] = nearby && userLoc ? userLoc : CITY_CENTER[city] ?? [28.55, 77.15];
  const mapBars = bars.map((b) => ({
    id: b.id,
    name: b.name,
    lat: b.lat,
    lng: b.lng,
    address: b.address,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold text-primary">
          Explore Bars
        </h1>
        <p className="text-sm text-muted-foreground">
          Where&apos;s the scene tonight? Tap a pin or a card.
        </p>
      </div>

      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={nearMe}
          disabled={locating}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm",
            nearby ? "pill-active" : "pill-inactive"
          )}
        >
          📍 {locating ? "Locating…" : "Near me"}
        </button>
        {CITIES.map((c) => (
          <button
            key={c}
            aria-pressed={!nearby && c === city}
            onClick={() => {
              const wasNearby = nearby;
              setNearby(false);
              setUserLoc(null);
              setNearbyMsg(null);
              if (c !== city) setCity(c);
              else if (wasNearby) fetchCity();
            }}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm",
              !nearby && c === city ? "pill-active" : "pill-inactive"
            )}
          >
            {c}
          </button>
        ))}
      </div>
      {(nearby || nearbyMsg) && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <span>{nearby ? "Showing real bars near you (Google Places)." : nearbyMsg}</span>
          {nearby && (
            <button onClick={exitNearby} className="shrink-0 text-primary underline-offset-2 hover:underline">
              Back to city bars
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          variant="search"
          placeholder="Search bars, areas, drinks…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="hide-scrollbar flex gap-1 overflow-x-auto">
          <button
            aria-pressed={!type}
            onClick={() => setType(null)}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-xs",
              !type ? "pill-active" : "pill-inactive"
            )}
          >
            All
          </button>
          {TYPES.map((t) => (
            <button
              key={t}
              aria-pressed={t === type}
              onClick={() => setType(t === type ? null : t)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-xs",
                t === type ? "pill-active" : "pill-inactive"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* grid-cols-1 base: without it, mobile falls back to a max-content column
          that a wide bar card can push past the viewport (horizontal overflow). */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="order-2 min-w-0 space-y-2 lg:order-1 lg:max-h-[70vh] lg:overflow-y-auto lg:pr-1">
          {loading && <CardListSkeleton count={4} />}
          {!loading && bars.length === 0 && (
            <EmptyState
              emoji="🍸"
              title="No bars mapped here yet"
              subtitle="Try another neighborhood or city — the map's still filling up."
            />
          )}
          {bars.map((b) => (
            <BarCard
              key={b.id}
              b={b}
              active={b.id === selected}
              onSelect={() => setSelected(b.id)}
              onAskJames={() => askJames(b)}
            />
          ))}
        </div>

        {/* isolate = own stacking context, so Leaflet's internal z-indexes (panes
            up to ~700, controls ~1000) can't escape and render over fixed overlays
            like the James panel (z-50). */}
        <div className="isolate order-1 h-[42vh] overflow-hidden rounded-2xl border border-border/50 lg:order-2 lg:sticky lg:top-20 lg:h-[70vh]">
          <BarsMap
            bars={mapBars}
            center={center}
            selectedId={selected}
            onSelect={setSelected}
          />
        </div>
      </div>
    </div>
  );
}
