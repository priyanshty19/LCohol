"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { CardListSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { saveProfileLocation } from "@/lib/client-location";
import { filterNearbyBars } from "@/lib/nearby-places";
import { barsRequest } from "@/lib/bars-query";
import { CircleLoves } from "@/components/cocktails/circle-loves";

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
        "media-card cursor-pointer p-3.5",
        active && "border-primary/60 shadow-[0_0_22px_color-mix(in_srgb,var(--primary)_28%,transparent)]"
      )}
    >
      {/* A lit left rail marks the bar currently pinned on the map, so the
          list and the map always agree about what's selected. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-[3px] transition-opacity",
          active ? "bg-primary opacity-100 shadow-[0_0_12px_var(--primary)]" : "opacity-0"
        )}
      />
      <div className="flex items-start justify-between gap-2 pl-1.5">
        <div className="min-w-0">
          <span className="section-title block truncate text-base">
            {b.name}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {b.address}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {b.rating != null && (
            <span className="overlay-chip !border-primary/35 !bg-primary/15 !text-primary">
              ★ {Number(b.rating).toFixed(1)}
            </span>
          )}
          {priceTier(b.priceRange) && (
            <span className="text-[11px] text-muted-foreground">
              {priceTier(b.priceRange)}
            </span>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-1.5">
        <Badge variant="drink">{b.type}</Badge>
        {b.bestsellers?.slice(0, 3).map((d) => (
          <Badge key={d} variant="topic">
            {d}
          </Badge>
        ))}
      </div>

      {active && (
        <div className="mt-3 space-y-2 pl-1.5">
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

export function BarsView({ mapsApiKey }: { mapsApiKey: string }) {
  const [city, setCity] = useState("Delhi NCR");
  const [type, setType] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [bars, setBars] = useState<Bar[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Nearby (Google Places) mode — real bars around the user's location.
  const [nearby, setNearby] = useState(false);
  const [locating, setLocating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  // Render the Google map only AFTER mount. Even though BarsMap is ssr:false,
  // mounting a browser-only map during hydration can throw in the production build and
  // silently abort hydration of the whole BarsView subtree (dead city buttons,
  // dead search). Gating on `mapReady` keeps the server HTML and first client
  // render identical (both the placeholder), so hydration always completes.
  const [mapReady, setMapReady] = useState(false);
  const requestQuery = nearby ? "" : q;
  useEffect(() => {
    const t = window.setTimeout(() => setMapReady(true), 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (nearby && !userLoc) return;
    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setStatusMsg(null);
      const { endpoint, params } = barsRequest({
        city,
        type,
        query: requestQuery,
        nearbyLocation: nearby ? userLoc : null,
      });

      try {
        const response = await fetch(`${endpoint}?${params.toString()}`, {
          signal: controller.signal,
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error ?? "Couldn't load bars.");

        const places = (body.data ?? []) as Bar[];
        setBars(places);
        setSelected(null);
        if (!places.length) {
          setStatusMsg(
            nearby ? "No matching places found within about 3 km." : "No matching places found for this city.",
          );
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setBars([]);
        setSelected(null);
        setStatusMsg(error instanceof Error ? error.message : "Couldn't load bars.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, requestQuery.trim() ? 350 : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [city, type, requestQuery, nearby, userLoc]);

  function nearMe() {
    if (nearby && userLoc) return;
    if (!("geolocation" in navigator)) {
      setStatusMsg("This device can't share location.");
      return;
    }
    setLocating(true);
    setStatusMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLoc([latitude, longitude]);
        setNearby(true);
        setLocating(false);
        fetch(`/api/location/reverse?lat=${latitude}&lng=${longitude}`)
          .then(async (r) => (r.ok ? r.json() : null))
          .then((body) => {
            if (body?.data) saveProfileLocation(body.data);
          })
          .catch(() => {});
      },
      () => {
        setLocating(false);
        setStatusMsg("Location permission denied — showing curated places for the selected city.");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  }

  function exitNearby() {
    setNearby(false);
    setUserLoc(null);
    setStatusMsg(null);
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

  const visibleBars = useMemo(() => nearby ? filterNearbyBars(bars, q) : bars, [nearby, bars, q]);
  const center: [number, number] = nearby && userLoc ? userLoc : CITY_CENTER[city] ?? [28.55, 77.15];
  const mapBars = useMemo(() => visibleBars.map((b) => ({
    id: b.id,
    name: b.name,
    lat: b.lat,
    lng: b.lng,
    address: b.address,
    type: b.type,
    rating: b.rating,
  })), [visibleBars]);

  return (
    <div className="space-y-4">
      <header className="space-y-1.5">
        <h1 className="screen-title text-foreground">Bars &amp; Cocktails</h1>
        <p className="text-sm text-muted-foreground">
          Where&apos;s the scene tonight? Tap a pin or a card.
        </p>
      </header>

      <div className="rail -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          onClick={nearMe}
          disabled={locating}
          className={cn("chip rail-item min-h-9", nearby ? "chip-on" : "chip-off")}
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
              setStatusMsg(null);
              if (c !== city) setCity(c);
              else if (!wasNearby) setSelected(null);
            }}
            className={cn(
              "chip rail-item min-h-9",
              !nearby && c === city ? "chip-on" : "chip-off"
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        <span>
          {statusMsg ??
            (nearby
              ? "Showing operational places near you from Google Maps."
              : "Showing Sip Stories picks for this city, plus live matches from Google Maps.")}
        </span>
        {nearby && (
          <button onClick={exitNearby} className="shrink-0 text-primary underline-offset-2 hover:underline">
            Back to city bars
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          variant="search"
          placeholder="Search bars, areas, drinks…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="rail -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            aria-pressed={!type}
            onClick={() => setType(null)}
            className={cn("chip rail-item !py-1.5 text-xs", !type ? "chip-on" : "chip-off")}
          >
            All
          </button>
          {TYPES.map((t) => (
            <button
              key={t}
              aria-pressed={t === type}
              onClick={() => setType(t === type ? null : t)}
              className={cn(
                "chip rail-item !py-1.5 text-xs",
                t === type ? "chip-on" : "chip-off"
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
          <h2 className="section-title">Discover bars</h2>
          {loading && <CardListSkeleton count={4} />}
          {!loading && visibleBars.length === 0 && (
            <EmptyState
              emoji="🍸"
              title="No matching places"
              subtitle="Try another city, category, or search term."
            />
          )}
          {!loading && visibleBars.map((b) => (
            <BarCard
              key={b.id}
              b={b}
              active={b.id === selected}
              onSelect={() => setSelected(b.id)}
              onAskJames={() => askJames(b)}
            />
          ))}
        </div>

        {/* Keep map controls below fixed overlays such as the James panel. */}
        <div className="isolate order-1 h-[52vh] min-h-[380px] overflow-hidden rounded-lg border border-[var(--glass-border)] lg:order-2 lg:sticky lg:top-20 lg:h-[70vh]">
          {mapReady ? (
            <BarsMap
              apiKey={mapsApiKey}
              bars={mapBars}
              center={center}
              selectedId={selected}
              onSelect={setSelected}
              locationLabel={nearby ? "Near you" : city}
              onAskJames={(id) => {
                const bar = visibleBars.find((item) => item.id === id);
                if (bar) askJames(bar);
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#0c0d12] text-sm text-muted-foreground">
              Loading map…
            </div>
          )}
        </div>
      </div>

      {/* Cocktails your connections have invented — the stitch bars screen
          pairs venue discovery with this rail. Renders nothing when the
          viewer's circle is empty, so it never leaves a hole. */}
      <CircleLoves title="Loved by your circle" />
    </div>
  );
}
