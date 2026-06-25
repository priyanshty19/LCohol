import type { ThemeId } from "@/lib/theme";

// James's "hands". Actions are decided by the LLM (server, via tool calls) and
// EXECUTED on the client (set_vibe/navigate touch document + router, which only
// exist in the browser). To teach James a new trick: add a NAV_TARGET or a new
// JamesAction variant + a tool in the agent route + a case in the client runner.

export type JamesAction =
  | { type: "set_vibe"; theme: ThemeId; label: string }
  | { type: "navigate"; path: string; label: string };

// Pages James can open, keyed by the id he passes to the open_page tool.
export const NAV_TARGETS: Record<string, { path: string; label: string }> = {
  feed: { path: "/", label: "the feed" },
  drinks: { path: "/drinks", label: "Drinks" },
  cocktails: { path: "/cocktails", label: "Cocktails" },
  bars: { path: "/bars", label: "Bars" },
  mix: { path: "/mix", label: "the Mix Lab" },
  vibe: { path: "/vibe", label: "Vibe picker" },
  search: { path: "/search", label: "Search" },
  hangover: { path: "/hangover", label: "Hangover SOS" },
  help: { path: "/help", label: "Help & Safety" },
  create: { path: "/create", label: "Share a Story" },
  parties: { path: "/parties", label: "Parties" },
  circle: { path: "/circle", label: "your Circle" },
  settings: { path: "/settings", label: "Settings" },
  terms: { path: "/compliance/terms", label: "Terms & Conditions" },
  privacy: { path: "/compliance/privacy", label: "the Privacy Policy" },
  grievance: { path: "/compliance/grievance", label: "the Grievance Officer" },
};

export const NAV_IDS = Object.keys(NAV_TARGETS);
