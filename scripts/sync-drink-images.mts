/**
 * Generate one permanent, license-free SVG for every seeded drink and optionally
 * write the matching public URL to Drink.imageUrl.
 *
 * Generate assets only: npm run db:images
 * Generate and update the configured database: npm run db:images -- --apply
 */
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DRINKS } from "./seed-drinks";

type Look = {
  from: string;
  to: string;
  accent: string;
  liquid: string;
  shape: "squat" | "longneck" | "wine" | "tall" | "rounded" | "can";
};

const LOOKS: Record<string, Look> = {
  whisky: { from: "#211108", to: "#754018", accent: "#efbd67", liquid: "#b86620", shape: "squat" },
  beer: { from: "#261b05", to: "#8a6416", accent: "#f4d77b", liquid: "#d99d22", shape: "longneck" },
  rum: { from: "#241008", to: "#743812", accent: "#e4a45c", liquid: "#914514", shape: "rounded" },
  gin: { from: "#09251c", to: "#276b51", accent: "#b3e0bf", liquid: "#a8d7c0", shape: "tall" },
  vodka: { from: "#102033", to: "#38678e", accent: "#c8e5f6", liquid: "#e6f5ff", shape: "tall" },
  wine: { from: "#280715", to: "#74152f", accent: "#dc7891", liquid: "#7d112c", shape: "wine" },
  tequila: { from: "#252a0e", to: "#66731f", accent: "#dfe78a", liquid: "#e4dc92", shape: "tall" },
  liqueur: { from: "#221028", to: "#663064", accent: "#e1acd6", liquid: "#75405d", shape: "rounded" },
  brandy: { from: "#2b1006", to: "#843b10", accent: "#e4aa62", liquid: "#a65317", shape: "squat" },
  "soft-drinks": { from: "#2d0a0f", to: "#8d1d29", accent: "#f39aa3", liquid: "#421014", shape: "can" },
};

const SHAPES: Record<Look["shape"], string> = {
  squat: "M82 26h16v16l16 18v66a8 8 0 0 1-8 8H74a8 8 0 0 1-8-8V60l16-18z",
  longneck: "M84 20h12v32l12 18v64a7 7 0 0 1-7 7H79a7 7 0 0 1-7-7V70l12-18z",
  wine: "M84 16h12v34l14 22v70a6 6 0 0 1-6 6H76a6 6 0 0 1-6-6V72l14-22z",
  tall: "M80 22h20v18l10 14v72a8 8 0 0 1-8 8H78a8 8 0 0 1-8-8V54l10-14z",
  rounded: "M82 26h16v14c17 6 25 19 25 37v45a8 8 0 0 1-8 8H65a8 8 0 0 1-8-8V77c0-18 8-31 25-37z",
  can: "M70 40h40v86a8 8 0 0 1-8 8H78a8 8 0 0 1-8-8z",
};

const CLEAR_SPIRIT = /\b(white|silver|blanco|light|crystal)\b/i;

function hash(value: string) {
  let result = 0;
  for (const char of value) result = (result * 31 + char.charCodeAt(0)) >>> 0;
  return result;
}

function xml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);
}

function artwork(drink: (typeof DRINKS)[number]) {
  const look = LOOKS[drink.categorySlug] ?? LOOKS.whisky;
  const seed = hash(drink.slug);
  const fillTop = 76 + (seed % 16);
  const liquid = CLEAR_SPIRIT.test(drink.name) ? "#edf7fb" : look.liquid;
  const label = drink.name.length > 24 ? `${drink.name.slice(0, 22)}…` : drink.name;
  const brand = drink.brand.length > 30 ? `${drink.brand.slice(0, 28)}…` : drink.brand;
  const shape = SHAPES[look.shape];
  const canTop = look.shape === "can" ? '<path d="M72 34h36l3 6H69z" fill="#fff8eb" opacity=".9"/>' : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" role="img" aria-labelledby="title desc">
  <title id="title">${xml(drink.name)}</title>
  <desc id="desc">Sip Stories illustrated ${xml(drink.categorySlug)} bottle</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${look.from}"/><stop offset="1" stop-color="${look.to}"/></linearGradient>
    <radialGradient id="glow"><stop stop-color="#fff" stop-opacity=".24"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <clipPath id="bottle"><path d="${shape}"/></clipPath>
    <filter id="shadow"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-opacity=".45"/></filter>
  </defs>
  <rect width="640" height="480" rx="28" fill="url(#bg)"/>
  <circle cx="120" cy="80" r="190" fill="url(#glow)"/>
  <circle cx="570" cy="410" r="170" fill="#000" opacity=".13"/>
  <path d="M40 384C170 330 264 422 416 359c73-30 130-21 184 1v120H40z" fill="#080608" opacity=".2"/>
  <g transform="translate(140 24) scale(2)" filter="url(#shadow)">
    <path d="${shape}" fill="#fff8eb" opacity=".92"/>
    <rect x="0" y="${fillTop}" width="180" height="110" fill="${liquid}" clip-path="url(#bottle)" opacity=".96"/>
    ${canTop}
    <rect x="67" y="94" width="46" height="34" rx="4" fill="${look.accent}"/>
    <path d="M75 105h30M75 114h22" stroke="${look.from}" stroke-width="4" stroke-linecap="round" opacity=".72"/>
    <path d="${shape}" fill="none" stroke="#fff" stroke-width="2.5" opacity=".55"/>
  </g>
  <text x="38" y="405" fill="#fff8eb" font-family="Georgia,serif" font-size="25" font-weight="700">${xml(label)}</text>
  <text x="40" y="434" fill="#fff8eb" opacity=".72" font-family="Arial,sans-serif" font-size="14" letter-spacing="1.5">${xml(brand.toUpperCase())}</text>
  <text x="600" y="434" text-anchor="end" fill="#fff8eb" opacity=".72" font-family="Arial,sans-serif" font-size="12" letter-spacing="2">SIP STORIES</text>
</svg>`;
}

const outputDir = path.join(process.cwd(), "public", "images", "drinks");
await mkdir(outputDir, { recursive: true });
for (const drink of DRINKS) {
  await writeFile(path.join(outputDir, `${drink.slug}.svg`), artwork(drink), "utf8");
}
console.log(`Generated ${DRINKS.length} drink images in public/images/drinks.`);

if (process.argv.includes("--apply")) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required with --apply");
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }),
  });
  try {
    const updates = await prisma.$transaction(
      DRINKS.map((drink) =>
        prisma.drink.update({
          where: { slug: drink.slug },
          data: { imageUrl: `/images/drinks/${drink.slug}.svg` },
          select: { id: true },
        }),
      ),
    );
    console.log(`Updated ${updates.length} drink image URLs in the configured database.`);
  } finally {
    await prisma.$disconnect();
  }
}
