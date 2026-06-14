// Drinking games James can run. Each has a sober-friendly mode so teetotalers play too.
export type Game = {
  name: string;
  players: string;
  blurb: string;
};

export const GAMES: Game[] = [
  {
    name: "Most Likely To",
    players: "3+",
    blurb: "Point at who's 'most likely to text their ex tonight'. Most votes sips (or sips soda).",
  },
  {
    name: "Antakshari Shots",
    players: "4+",
    blurb: "Classic song chain — fumble the next song or repeat one, and you sip.",
  },
  {
    name: "Kings (Desi edition)",
    players: "3+",
    blurb: "Draw cards; each rank is a rule. King = make a rule, the desi twist: loser does the next theka run (juice run for the sober).",
  },
  {
    name: "Truth or Sip",
    players: "2+",
    blurb: "Truth or dare, but ducking the question costs you a sip instead.",
  },
  {
    name: "Flip the Cup",
    players: "4+ (teams)",
    blurb: "Drink, then flip the cup upside-down with a finger flick. First team to flip all wins. Water works fine.",
  },
  {
    name: "Bollywood Buzz",
    players: "3+",
    blurb: "Count up, but every multiple of 7 (or with a 7) becomes a film name. Slip up, you sip.",
  },
  {
    name: "Never Have I Ever",
    players: "3+",
    blurb: "Say something you've never done; anyone who has, sips. Keep it kind.",
  },
  {
    name: "The Categories",
    players: "2+",
    blurb: "Pick a category (Indian beers, Shah Rukh films). Go around naming one; blank or repeat = sip.",
  },
];

export function gamesContext(): string {
  return GAMES.map((g) => `- ${g.name} (${g.players}): ${g.blurb}`).join("\n");
}
