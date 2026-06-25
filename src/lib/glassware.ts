// Glass definitions for the gamified Mix Lab. Each glass is a half-profile
// [radius, y] (bottom → rim) revolved around the Y axis (LatheGeometry). `inner`
// is the bowl interior the liquid fills; `wall` is the visible glassware. Numbers
// are in scene units (~0..2.4 tall) and tuned visually.

export type GlassId = "rocks" | "highball" | "martini" | "coupe" | "wine" | "flute";

export type GlassDef = {
  id: GlassId;
  name: string;
  blurb: string;
  wall: [number, number][]; // outer glassware profile
  inner: [number, number][]; // liquid interior (bowl only)
  rimY: number;
  rimR: number;
  liquidBottom: number; // y where liquid begins (top of stem for stemware)
};

export const GLASSES: Record<GlassId, GlassDef> = {
  rocks: {
    id: "rocks",
    name: "Rocks",
    blurb: "Short & wide — spirits, old fashioneds",
    wall: [[0, 0], [0.6, 0], [0.63, 0.05], [0.63, 0.5], [0.625, 1.02]],
    inner: [[0, 0.06], [0.55, 0.06], [0.56, 0.5], [0.57, 1.02]],
    rimY: 1.02,
    rimR: 0.625,
    liquidBottom: 0.06,
  },
  highball: {
    id: "highball",
    name: "Highball",
    blurb: "Tall & lean — long drinks, fizz",
    wall: [[0, 0], [0.43, 0], [0.45, 0.05], [0.45, 1.0], [0.445, 2.0]],
    inner: [[0, 0.06], [0.39, 0.06], [0.4, 1.0], [0.4, 2.0]],
    rimY: 2.0,
    rimR: 0.445,
    liquidBottom: 0.06,
  },
  martini: {
    id: "martini",
    name: "Martini",
    blurb: "The cone — stirred & strained",
    wall: [[0, 0], [0.5, 0], [0.5, 0.045], [0.42, 0.06], [0.08, 0.1], [0.06, 0.86], [0.1, 0.9], [0.9, 1.7]],
    inner: [[0, 0.9], [0.42, 1.29], [0.84, 1.68]],
    rimY: 1.7,
    rimR: 0.9,
    liquidBottom: 0.9,
  },
  coupe: {
    id: "coupe",
    name: "Coupe",
    blurb: "Shallow bowl — sours, champagne",
    // dense bowl points → smooth round bowl (not faceted)
    wall: [[0, 0], [0.5, 0], [0.5, 0.045], [0.42, 0.06], [0.08, 0.1], [0.06, 0.8],
           [0.12, 0.84], [0.24, 0.9], [0.4, 0.99], [0.56, 1.08], [0.68, 1.15]],
    inner: [[0, 0.85], [0.13, 0.88], [0.27, 0.94], [0.42, 1.02], [0.56, 1.1], [0.64, 1.14]],
    rimY: 1.15,
    rimR: 0.68,
    liquidBottom: 0.85,
  },
  wine: {
    id: "wine",
    name: "Wine",
    blurb: "Rounded bowl — wine, spritz",
    // dense, egg-shaped bowl curve so the lathe reads as a smooth glass
    wall: [[0, 0], [0.48, 0], [0.5, 0.04], [0.42, 0.055], [0.07, 0.1], [0.055, 0.72],
           [0.12, 0.77], [0.22, 0.83], [0.34, 0.93], [0.45, 1.08], [0.52, 1.26],
           [0.545, 1.46], [0.525, 1.64], [0.47, 1.79], [0.41, 1.9]],
    inner: [[0, 0.8], [0.1, 0.83], [0.21, 0.89], [0.33, 0.99], [0.43, 1.14],
            [0.49, 1.32], [0.49, 1.5], [0.45, 1.66], [0.4, 1.84]],
    rimY: 1.9,
    rimR: 0.41,
    liquidBottom: 0.8,
  },
  flute: {
    id: "flute",
    name: "Flute",
    blurb: "Tall & narrow — bubbles, sparkling",
    wall: [[0, 0], [0.48, 0], [0.5, 0.04], [0.42, 0.055], [0.07, 0.1], [0.06, 0.68],
           [0.12, 0.74], [0.22, 0.88], [0.28, 1.1], [0.295, 1.5], [0.285, 2.0], [0.26, 2.2]],
    inner: [[0, 0.74], [0.1, 0.79], [0.2, 0.92], [0.25, 1.15], [0.26, 1.5], [0.255, 2.0], [0.24, 2.18]],
    rimY: 2.2,
    rimR: 0.26,
    liquidBottom: 0.74,
  },
};

export const GLASS_LIST: GlassDef[] = [
  GLASSES.rocks,
  GLASSES.highball,
  GLASSES.martini,
  GLASSES.coupe,
  GLASSES.wine,
  GLASSES.flute,
];

// Linear-interpolate the interior radius at height y (for the liquid surface disk).
export function innerRadiusAt(inner: [number, number][], y: number): number {
  if (y <= inner[0][1]) return inner[0][0];
  const last = inner[inner.length - 1];
  if (y >= last[1]) return last[0];
  for (let i = 0; i < inner.length - 1; i++) {
    const [r0, y0] = inner[i];
    const [r1, y1] = inner[i + 1];
    if (y >= y0 && y <= y1) {
      const t = (y - y0) / (y1 - y0 || 1);
      return r0 + (r1 - r0) * t;
    }
  }
  return last[0];
}
