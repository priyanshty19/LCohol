"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapBar = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
};

// Basemap is the OPPOSITE lightness of the UI so the map reads as a distinct,
// legible panel. Both styles are CARTO (one CSP host, keyless, production-safe).
//  - light UI -> dark_all (dark map, light streets), brightened to show detail.
//  - dark UI  -> Voyager IN COLOR: a clear, Google-Maps-like white map with
//    drawn streets (white fills + casing, colored arterials) and black labels.
//    We keep it colored on purpose — graying it out flattens the very road
//    contrast we want. (A true black-and-white "Toner" map would need a keyed
//    provider; CARTO's free tiles don't offer bold-black streets.)
const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const LIGHT_TILES =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

const DARK_ATTR = "&copy; OpenStreetMap &copy; CARTO";
const LIGHT_ATTR = "&copy; OpenStreetMap &copy; CARTO";

// Tile-pane tuning. dark_all draws roads/labels as light lines ON near-black, so
// we brighten HARD to lift them into a clearly-readable dark map (the white
// Voyager side needs only a touch of contrast since it's legible as-is).
const DARK_TILE_FILTER = "brightness(2.5) contrast(1.28) saturate(1.3)";
const LIGHT_TILE_FILTER = "contrast(1.08)";

// Resolve the active theme's --background to an rgb() (the probe trick converts
// any color format — hex, oklch — to rgb via the computed `color`), then judge
// its luminance. Robust across the vibe themes, which don't all match the .dark
// class to their actual background lightness.
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
    // applyTheme() dispatches "themechange" — keep the basemap in lockstep.
    window.addEventListener("themechange", sync);
    return () => window.removeEventListener("themechange", sync);
  }, []);
  return light;
}

// Apply the tile filter via Leaflet's pane API. We do NOT use MapContainer's
// className for this: react-leaflet sets that once at init and never updates it,
// so on a live theme change the tiles would swap but the filter would go stale
// (e.g. the dark-tile brightness washing out the light basemap to pure white).
function TileFilter({ lightUi }: { lightUi: boolean }) {
  const map = useMap();
  useEffect(() => {
    const pane = map.getPane("tilePane");
    if (pane) pane.style.filter = lightUi ? DARK_TILE_FILTER : LIGHT_TILE_FILTER;
  }, [map, lightUi]);
  return null;
}

function pinIcon(active: boolean) {
  const size = active ? 18 : 14;
  const color = active ? "#b11226" : "#f2bf64";
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};box-shadow:0 0 ${
      active ? 14 : 8
    }px ${color};border:2px solid #0c0d12"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom() < 11 ? 12 : map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export default function BarsMap({
  bars,
  center,
  selectedId,
  onSelect,
}: {
  bars: MapBar[];
  center: [number, number];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const lightUi = useLightUi();
  // Light UI -> dark map; dark UI -> light map.
  const tileUrl = lightUi ? DARK_TILES : LIGHT_TILES;
  const attribution = lightUi ? DARK_ATTR : LIGHT_ATTR;

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom
      className="h-full w-full"
      style={{ background: lightUi ? "#0c0d12" : "#e7e9ec" }}
    >
      <TileLayer key={tileUrl} url={tileUrl} attribution={attribution} />
      <TileFilter lightUi={lightUi} />
      <Recenter center={center} />
      {bars.map((b) => (
        <Marker
          key={b.id}
          position={[b.lat, b.lng]}
          icon={pinIcon(b.id === selectedId)}
          eventHandlers={{ click: () => onSelect(b.id) }}
        >
          <Popup>
            <strong>{b.name}</strong>
            <br />
            {b.address}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
