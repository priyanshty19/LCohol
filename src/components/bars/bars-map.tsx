"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed, Martini, Maximize, MessageCircle, Navigation, Plus, Minus } from "lucide-react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";

export type MapBar = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  type: string;
  rating: number | string | null;
};

/* ------------------------------------------------------------------------
 * Minimal local typings for the Google Maps JS API.
 *
 * Deliberately NOT using the global `google.maps.*` namespace: that needs the
 * @types/google.maps package, and a missing devDependency would break `tsc`
 * for everyone. These cover exactly the surface this file touches.
 * ---------------------------------------------------------------------- */
type LatLngLiteral = { lat: number; lng: number };
type MapStyle = Record<string, unknown>;

interface GMap {
  panTo(p: LatLngLiteral): void;
  setZoom(z: number): void;
  getZoom(): number | undefined;
  setOptions(o: Record<string, unknown>): void;
  fitBounds(bounds: GBounds, padding: number): void;
}
interface GBounds {
  extend(p: LatLngLiteral): void;
}
interface GMarker {
  setMap(m: GMap | null): void;
  setIcon(i: Record<string, unknown>): void;
  setPosition(p: LatLngLiteral): void;
  setZIndex(z: number): void;
  addListener(ev: string, cb: () => void): void;
}
interface GPoint {
  x: number;
  y: number;
}
interface GMapsApi {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => GMap;
  Marker: new (opts: Record<string, unknown>) => GMarker;
  LatLngBounds: new () => GBounds;
  Point: new (x: number, y: number) => GPoint;
}
declare global {
  interface Window {
    google?: { maps?: GMapsApi };
  }
}
function gmaps(): GMapsApi {
  const api = window.google?.maps;
  if (!api) throw new Error("Google Maps not loaded");
  return api;
}

/* Basemap is the OPPOSITE lightness of the UI so the map reads as a distinct,
 * legible panel — the same rule the CARTO version followed.
 *
 * NOTE: a `styles` array and a cloud `mapId` are mutually exclusive (Google
 * ignores styles when a mapId is set). Styles are used here so the dark/light
 * swap needs no Cloud Console setup — which also means classic Marker rather
 * than AdvancedMarkerElement, since that one requires a mapId. */
const DARK_STYLE: MapStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1d2026" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1d2026" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9aa0a6" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c3038" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#3a3f4a" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#4a505c" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#b6bcc6" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#12151a" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#22262d" }] },
];

const LIGHT_STYLE: MapStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#eef1f0" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#49565c" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#cbd3d7" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cce7ec" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#dce9e0" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

/** Resolve the active theme's --background to rgb and judge its luminance, so the
 *  basemap tracks the vibe themes (which don't all match .dark to their real
 *  background lightness). Same probe trick the CARTO version used. */
function bgIsLight(): boolean {
  if (typeof document === "undefined") return false;
  const probe = document.createElement("span");
  probe.style.color = "var(--background)";
  probe.style.display = "none";
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  const m = rgb.match(/(\d+\.?\d*)[,\s]+(\d+\.?\d*)[,\s]+(\d+\.?\d*)/);
  if (!m) return false;
  const [r, g, b] = [+m[1], +m[2], +m[3]];
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.5;
}

function useLightUi(): boolean {
  const [light, setLight] = useState<boolean>(() => bgIsLight());
  useEffect(() => {
    const sync = () => setLight(bgIsLight());
    sync();
    window.addEventListener("themechange", sync);
    return () => window.removeEventListener("themechange", sync);
  }, []);
  return light;
}

/* The Sip Stories cocktail glass, as one filled 24x24 silhouette: bowl rim
 * across the top, tapering to the stem, then out to the foot. Same conical
 * glass the Bars tab uses in the nav, so a pin reads as "bar" at a glance
 * instead of as an anonymous dot. */
const GLASS_PATH = "M3 2 H21 L13 12.5 V19 H17.5 V22 H6.5 V19 H11 V12.5 Z";
const MAP_CONTROLS = [
  { label: "Zoom in", Icon: Plus, action: "in" },
  { label: "Zoom out", Icon: Minus, action: "out" },
  { label: "Show all places", Icon: Maximize, action: "fit" },
  { label: "Recenter map", Icon: LocateFixed, action: "center" },
] as const;

function pinIcon(active: boolean): Record<string, unknown> {
  return {
    path: GLASS_PATH,
    scale: active ? 1.3 : 0.95,
    fillColor: active ? "#b11226" : "#f2bf64",
    fillOpacity: 1,
    strokeColor: "#0c0d12",
    strokeWeight: 1.5,
    // Anchor on the foot, not the centre, so the glass stands on the bar's
    // actual coordinates the way a map pin should.
    anchor: new (gmaps().Point)(12, 22),
  };
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--card)] p-4 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export default function BarsMap({
  apiKey,
  bars,
  center,
  selectedId,
  onSelect,
  locationLabel,
  onAskJames,
}: {
  apiKey: string;
  bars: MapBar[];
  center: [number, number];
  selectedId: string | null;
  onSelect: (id: string) => void;
  locationLabel: string;
  onAskJames: (id: string) => void;
}) {
  const lightUi = useLightUi();
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GMap | null>(null);
  const markersRef = useRef<Map<string, GMarker>>(new Map());
  const [centerLat, centerLng] = center;
  const selectedBar = bars.find((bar) => bar.id === selectedId);
  // onSelect lives in a ref so marker click handlers never need rebinding when
  // the parent re-renders with a new closure. Synced in an effect — writing a
  // ref during render is a React violation (react-hooks/refs).
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // --- create the map once
  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !hostRef.current || mapRef.current) return;
        const g = gmaps();
        mapRef.current = new g.Map(hostRef.current, {
          center: { lat: center[0], lng: center[1] },
          zoom: 12,
          disableDefaultUI: true,
          zoomControl: false,
          gestureHandling: "cooperative",
          clickableIcons: false,
          styles: lightUi ? DARK_STYLE : LIGHT_STYLE,
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // Once on mount: later center/theme changes are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, attempt]);

  // --- theme swap
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    mapRef.current.setOptions({ styles: lightUi ? DARK_STYLE : LIGHT_STYLE });
  }, [ready, lightUi]);

  // --- recenter when the city (or "near me") changes
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    map.panTo({ lat: centerLat, lng: centerLng });
    if ((map.getZoom() ?? 12) < 11) map.setZoom(12);
  }, [ready, centerLat, centerLng]);

  // --- sync markers to the bars list
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const g = gmaps();
    const live = markersRef.current;
    const next = new Set(bars.map((b) => b.id));

    for (const [id, marker] of live) {
      if (!next.has(id)) {
        marker.setMap(null);
        live.delete(id);
      }
    }

    for (const b of bars) {
      let marker = live.get(b.id);
      if (!marker) {
        const created = new g.Marker({
          map,
          position: { lat: b.lat, lng: b.lng },
          title: b.name,
        });
        created.addListener("click", () => {
          onSelectRef.current(b.id);
        });
        live.set(b.id, created);
        marker = created;
      } else {
        marker.setPosition({ lat: b.lat, lng: b.lng });
      }
      marker.setIcon(pinIcon(false));
    }
  }, [ready, bars]);

  useEffect(() => {
    if (!ready) return;
    for (const [id, marker] of markersRef.current) {
      marker.setIcon(pinIcon(id === selectedId));
      marker.setZIndex(id === selectedId ? 999 : 1);
    }
    if (selectedBar && mapRef.current) {
      mapRef.current.panTo({ lat: selectedBar.lat, lng: selectedBar.lng });
    }
  }, [ready, bars, selectedId, selectedBar]);

  function fitVenues() {
    const map = mapRef.current;
    if (!map || !bars.length) return;
    if (bars.length === 1) {
      map.panTo({ lat: bars[0].lat, lng: bars[0].lng });
      map.setZoom(15);
      return;
    }
    const bounds = new (gmaps().LatLngBounds)();
    for (const bar of bars) bounds.extend({ lat: bar.lat, lng: bar.lng });
    map.fitBounds(bounds, 48);
  }

  function handleControl(action: (typeof MAP_CONTROLS)[number]["action"]) {
    const map = mapRef.current;
    if (!map) return;
    if (action === "fit") fitVenues();
    else if (action === "center") {
      map.panTo({ lat: centerLat, lng: centerLng });
      map.setZoom(12);
    } else map.setZoom(Math.max(3, Math.min(21, (map.getZoom() ?? 12) + (action === "in" ? 1 : -1))));
  }

  // --- tear every marker down on unmount (the map node goes with the div)
  useEffect(
    () => () => {
      for (const m of markersRef.current.values()) m.setMap(null);
      markersRef.current.clear();
    },
    [],
  );

  if (!apiKey) {
    return (
      <Notice>
        Google Maps is not configured yet.
      </Notice>
    );
  }
  return (
    <section aria-label="SipStories Map" className="flex h-full min-h-0 flex-col bg-card text-card-foreground">
      <header className="flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Martini aria-hidden="true" className="size-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">SipStories Map</h2>
            <p className="truncate text-xs text-muted-foreground">{locationLabel}</p>
          </div>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{bars.length} places</span>
      </header>
      <div className="relative min-h-0 flex-1">
        <div ref={hostRef} className="h-full w-full" style={{ background: lightUi ? "#1d2026" : "#eef1f0" }} />
        {!ready && (
          <div className="absolute inset-0">
            <Notice>
              <div role="status" className="space-y-2">
                <p>{failed ? "Couldn't load the map." : "Loading map..."}</p>
                {failed && (
                  <button
                    type="button"
                    onClick={() => {
                      setFailed(false);
                      setAttempt((value) => value + 1);
                    }}
                    className="text-primary underline"
                  >
                    Retry
                  </button>
                )}
              </div>
            </Notice>
          </div>
        )}
        {ready && (
          <div role="group" aria-label="Map controls" className="absolute right-3 top-3 flex flex-col gap-1 rounded-lg border border-border bg-card p-1 shadow-md">
            {MAP_CONTROLS.map(({ label, Icon, action }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                title={label}
                disabled={action === "fit" && !bars.length}
                onClick={() => handleControl(action)}
                className="flex size-10 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40"
              >
                <Icon aria-hidden="true" className="size-4" />
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedBar && (
        <footer aria-live="polite" className="max-h-[40%] shrink-0 overflow-y-auto border-t border-border px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 break-words text-sm font-semibold">{selectedBar.name}</h3>
            {selectedBar.rating != null && <span className="shrink-0 text-xs text-primary">{Number(selectedBar.rating).toFixed(1)} / 5</span>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{selectedBar.type}</p>
          {selectedBar.address && <p className="mt-1 break-words text-xs text-muted-foreground">{selectedBar.address}</p>}
          <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedBar.lat},${selectedBar.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center gap-1.5 text-primary hover:underline"
            >
              <Navigation aria-hidden="true" className="size-4" />Directions
            </a>
            <button
              type="button"
              onClick={() => onAskJames(selectedBar.id)}
              className="inline-flex min-h-9 items-center gap-1.5 hover:text-primary"
            >
              <MessageCircle aria-hidden="true" className="size-4" />Ask James
            </button>
          </div>
        </footer>
      )}
    </section>
  );
}
