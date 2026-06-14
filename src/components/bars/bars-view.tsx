"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      onClick={onSelect}
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

export function BarsView() {
  const [city, setCity] = useState("Delhi NCR");
  const [type, setType] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [bars, setBars] = useState<Bar[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
  }, [city, type, q]);

  function askJames(b: Bar) {
    window.dispatchEvent(
      new CustomEvent("ask-james", {
        detail: {
          prompt: `Tell me about ${b.name} in ${b.city} — what should I order there?`,
        },
      })
    );
  }

  const center = CITY_CENTER[city] ?? [28.55, 77.15];
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
        {CITIES.map((c) => (
          <button
            key={c}
            onClick={() => setCity(c)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm",
              c === city ? "pill-active" : "pill-inactive"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          variant="search"
          placeholder="Search bars, areas, drinks…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="hide-scrollbar flex gap-1 overflow-x-auto">
          <button
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

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="order-2 space-y-2 lg:order-1 lg:max-h-[70vh] lg:overflow-y-auto lg:pr-1">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && bars.length === 0 && (
            <p className="text-sm text-muted-foreground">No bars found here yet.</p>
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

        <div className="order-1 h-[42vh] overflow-hidden rounded-2xl border border-border/50 lg:order-2 lg:sticky lg:top-20 lg:h-[70vh]">
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
