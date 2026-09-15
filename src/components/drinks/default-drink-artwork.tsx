import { cn } from "@/lib/utils";

type Props = {
  name: string;
  category?: string | null;
  kind?: "drink" | "cocktail";
  className?: string;
};

type Shape = "squat" | "longneck" | "wine" | "tall" | "rounded" | "can";

type Look = {
  shape: Shape;
  /** [backdrop from, backdrop to, label] */
  palette: readonly [string, string, string];
  liquid: string;
};

/**
 * Bottle silhouettes, drawn in a 180x180 box with the base at y=134 so every
 * category stands on the same line.
 */
const SHAPES: Record<Shape, string> = {
  squat: "M82 26h16v16l16 18v66a8 8 0 0 1-8 8H74a8 8 0 0 1-8-8V60l16-18z",
  longneck: "M84 20h12v32l12 18v64a7 7 0 0 1-7 7H79a7 7 0 0 1-7-7V70l12-18z",
  wine: "M84 16h12v34l14 22v70a6 6 0 0 1-6 6H76a6 6 0 0 1-6-6V72l14-22z",
  tall: "M80 22h20v18l10 14v72a8 8 0 0 1-8 8H78a8 8 0 0 1-8-8V54l10-14z",
  rounded: "M82 26h16v14c17 6 25 19 25 37v45a8 8 0 0 1-8 8H65a8 8 0 0 1-8-8V77c0-18 8-31 25-37z",
  can: "M70 40h40v86a8 8 0 0 1-8 8H78a8 8 0 0 1-8-8z",
};

/**
 * Category drives both the bottle and the colour, so a gin reads as a tall
 * botanical-green bottle and a whisky as a squat amber one. The previous
 * version hashed a random palette onto one generic bottle, which produced a
 * teal vodka and a brown white-rum.
 */
const CATEGORY_LOOK: Record<string, Look> = {
  whisky: { shape: "squat", palette: ["#33190a", "#8a4f1d", "#e8b567"], liquid: "#c07327" },
  whiskey: { shape: "squat", palette: ["#33190a", "#8a4f1d", "#e8b567"], liquid: "#c07327" },
  brandy: { shape: "squat", palette: ["#331207", "#8f4212", "#e2a763"], liquid: "#b25c18" },
  beer: { shape: "longneck", palette: ["#402805", "#a5731a", "#f2cf7a"], liquid: "#e0a52a" },
  wine: { shape: "wine", palette: ["#33091a", "#7d1733", "#d9748c"], liquid: "#83122f" },
  gin: { shape: "tall", palette: ["#0c2a20", "#2f7a5c", "#a9d9b8"], liquid: "#9ed3b2" },
  vodka: { shape: "tall", palette: ["#15243a", "#3f6d96", "#bcd9ef"], liquid: "#dbeeff" },
  tequila: { shape: "tall", palette: ["#2a3011", "#6f7d24", "#d6dd83"], liquid: "#e4dc92" },
  rum: { shape: "rounded", palette: ["#28120a", "#7a3f16", "#d79a55"], liquid: "#9d5019" },
  liqueur: { shape: "rounded", palette: ["#26122c", "#6b2f6e", "#dda9d4"], liquid: "#7a4460" },
  "soft drinks": { shape: "can", palette: ["#340c11", "#94202c", "#f0949c"], liquid: "#4a1116" },
};

const DEFAULT_LOOK: Look = {
  shape: "squat",
  palette: ["#2d1836", "#6f3a63", "#efb76f"],
  liquid: "#a2537e",
};

function hash(value: string) {
  let result = 0;
  for (const char of value) result = (result * 31 + char.charCodeAt(0)) >>> 0;
  return result;
}

/**
 * Callers pass the top-level category, so "Bacardi White" arrives as plain
 * "Rum" and would otherwise be poured dark. The name is the only place the
 * clear/aged distinction survives.
 */
const CLEAR_SPIRIT = /\b(white|silver|blanco|light|crystal)\b/i;
const CLEAR_LIQUID = "#eef4f2";

function lookFor(category: string | null | undefined, name: string): Look {
  const base = baseLook(category);
  const clearable = base.shape === "rounded" || base.shape === "tall";
  if (clearable && CLEAR_SPIRIT.test(name)) {
    return { ...base, liquid: CLEAR_LIQUID };
  }
  return base;
}

function baseLook(category?: string | null): Look {
  if (!category) return DEFAULT_LOOK;
  const key = category.trim().toLowerCase();
  if (CATEGORY_LOOK[key]) return CATEGORY_LOOK[key];
  // Subcategories arrive here too ("Single Malt", "Indian Whisky", "White Rum").
  for (const [name, look] of Object.entries(CATEGORY_LOOK)) {
    if (key.includes(name)) return look;
  }
  return DEFAULT_LOOK;
}

/**
 * A zero-storage editorial fallback for catalog items without photography.
 * It intentionally reads as artwork (not a broken/empty image) and varies by
 * drink name, while user-uploaded photography still takes precedence.
 */
export function DefaultDrinkArtwork({ name, category, kind = "drink", className }: Props) {
  const isCocktail = kind === "cocktail";
  const look = isCocktail ? DEFAULT_LOOK : lookFor(category, name);
  const seed = hash(`${name}:${category ?? ""}`);
  // Same category, different bottle: nudge the fill level per drink so a shelf
  // of whiskies does not look stamped from one template.
  const fillTop = 78 + (seed % 14);
  const uid = `dda${seed.toString(36)}`;
  const path = SHAPES[look.shape];

  return (
    <div
      className={cn("relative flex h-full w-full items-center justify-center overflow-hidden", className)}
      style={{ background: `linear-gradient(145deg, ${look.palette[0]}, ${look.palette[1]})` }}
      role="img"
      aria-label={`Illustrated placeholder for ${name}`}
    >
      <div className="absolute -left-[18%] -top-[24%] h-[68%] w-[68%] rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-[30%] -right-[20%] h-[75%] w-[75%] rounded-full bg-black/20 blur-2xl" />
      <svg viewBox="0 0 180 180" className="relative h-[72%] w-[72%] drop-shadow-2xl" aria-hidden="true">
        {isCocktail ? (
          <>
            <path d="M35 37h110L99 94v41" fill="none" stroke="#fff8eb" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M67 142h64" fill="none" stroke="#fff8eb" strokeWidth="6" strokeLinecap="round" />
            <path d="M48 51h84L96 88H79z" fill={look.palette[2]} opacity=".9" />
            <circle cx="129" cy="43" r="15" fill="#91bd54" stroke="#fff8eb" strokeWidth="4" />
            <path d="M129 28 86 88" stroke="#fff8eb" strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <defs>
              <clipPath id={`${uid}-clip`}>
                <path d={path} />
              </clipPath>
            </defs>
            {/* Glass */}
            <path d={path} fill="#fff8eb" opacity=".9" />
            {/* Liquid, clipped to the bottle so it fills the real silhouette */}
            <rect
              x="0"
              y={fillTop}
              width="180"
              height={180 - fillTop}
              fill={look.liquid}
              clipPath={`url(#${uid}-clip)`}
              opacity=".95"
            />
            {look.shape === "can" && <path d="M72 34h36l3 6H69z" fill="#fff8eb" opacity=".9" />}
            {/* Label */}
            <rect x="68" y="96" width="44" height="30" rx="3" fill={look.palette[2]} opacity=".96" />
            <path
              d="M76 106h28M76 114h20"
              stroke={look.palette[0]}
              strokeWidth="4"
              strokeLinecap="round"
              opacity=".75"
            />
            {/* Outline last so the liquid never bleeds past the glass edge */}
            <path d={path} fill="none" stroke="#fff8eb" strokeWidth="3" opacity=".55" />
          </>
        )}
      </svg>
      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 text-[#fff8eb]">
        <span className="line-clamp-1 font-display text-xs font-semibold tracking-wide">{name}</span>
        <span className="shrink-0 text-[9px] uppercase tracking-[0.16em] opacity-70">Sip Stories</span>
      </div>
    </div>
  );
}
