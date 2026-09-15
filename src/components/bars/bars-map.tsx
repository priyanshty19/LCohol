"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";

export type MapBar = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
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
}
interface GMarker {
  setMap(m: GMap | null): void;
  setIcon(i: Record<string, unknown>): void;
  setPosition(p: LatLngLiteral): void;
  setZIndex(z: number): void;
  addListener(ev: string, cb: () => void): void;
}
interface GInfoWindow {
  setContent(c: string): void;
  open(o: { map: GMap; anchor: GMarker }): void;
  close(): void;
}
interface GPoint {
  x: number;
  y: number;
}
interface GMapsApi {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => GMap;
  Marker: new (opts: Record<string, unknown>) => GMarker;
  InfoWindow: new () => GInfoWindow;
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
}: {
  apiKey: string;
  bars: MapBar[];
  center: [number, number];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const lightUi = useLightUi();
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GMap | null>(null);
  const markersRef = useRef<Map<string, GMarker>>(new Map());
  const infoRef = useRef<GInfoWindow | null>(null);
  // onSelect lives in a ref so marker click handlers never need rebinding when
  // the parent re-renders with a new closure. Synced in an effect — writing a
  // ref during render is a React violation (react-hooks/refs).
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
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
          zoomControl: true,
          clickableIcons: false,
          styles: lightUi ? DARK_STYLE : LIGHT_STYLE,
        });
        infoRef.current = new g.InfoWindow();
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
  }, []);

  // --- theme swap
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    mapRef.current.setOptions({ styles: lightUi ? DARK_STYLE : LIGHT_STYLE });
  }, [ready, lightUi]);

  // --- recenter when the city (or "near me") changes
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    map.panTo({ lat: center[0], lng: center[1] });
    if ((map.getZoom() ?? 12) < 11) map.setZoom(12);
  }, [ready, center]);

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
          const safe = (t: string) =>
            t.replace(/[&<>"]/g, (c) =>
              ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c,
            );
          infoRef.current?.setContent(
            `<div style="color:#111"><strong>${safe(b.name)}</strong>${
              b.address ? `<br/>${safe(b.address)}` : ""
            }</div>`,
          );
          infoRef.current?.open({ map, anchor: created });
        });
        live.set(b.id, created);
        marker = created;
      } else {
        marker.setPosition({ lat: b.lat, lng: b.lng });
      }
      marker.setIcon(pinIcon(b.id === selectedId));
      marker.setZIndex(b.id === selectedId ? 999 : 1);
    }
  }, [ready, bars, selectedId]);

  // --- tear every marker down on unmount (the map node goes with the div)
  useEffect(
    () => () => {
      for (const m of markersRef.current.values()) m.setMap(null);
      markersRef.current.clear();
      infoRef.current?.close();
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
  if (failed) return <Notice>Couldn&apos;t load Google Maps.</Notice>;

  return (
    <div
      ref={hostRef}
      className="h-full w-full"
      style={{ background: lightUi ? "#1d2026" : "#e7e9ec" }}
    />
  );
}
