"use client";

import { useEffect } from "react";
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
  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom
      className="h-full w-full"
      style={{ background: "#0c0d12" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap &copy; CARTO'
      />
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
