import { ImageResponse } from "next/og";

// Programmatic PWA/app icon — no binary assets to maintain. Rendered by Satori
// (next/og), so it stays pure JSX/CSS. Brand: deep wine background with a gold
// martini-glass mark. Used by the /icon-192.png and /icon-512.png routes that
// the web manifest points at (proper install artwork instead of favicon.ico).
export function appIcon(size: number): ImageResponse {
  const s = size / 512; // scale from the 512 design grid
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #241318 0%, #1a1012 100%)",
        }}
      >
        {/* Martini glass drawn with plain divs so no font/emoji dependency. */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* bowl (triangle) */}
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: `${150 * s}px solid transparent`,
              borderRight: `${150 * s}px solid transparent`,
              borderTop: `${130 * s}px solid #d9a441`,
            }}
          />
          {/* stem */}
          <div style={{ width: `${14 * s}px`, height: `${120 * s}px`, background: "#d9a441" }} />
          {/* base */}
          <div style={{ width: `${150 * s}px`, height: `${16 * s}px`, borderRadius: `${8 * s}px`, background: "#d9a441" }} />
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
