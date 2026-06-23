// On-brand loading phrases in James's voice (warm, Indian bar culture, light
// Hinglish). One source of truth so every loader sounds like the same bartender.
export const LOADING_PHRASES: Record<string, string[]> = {
  feed: ["Pulling up the room…", "Catching the latest pours…", "Setting the scene…"],
  drinks: ["Stocking the bar…", "Lining up the bottles…", "One spirit at a time…"],
  cocktails: ["Pouring the list…", "Checking the shelf…", "Shaking things up…"],
  bars: ["Scouting the scene…", "Finding the best spots…", "Mapping the night…"],
  mix: ["Setting up the lab…", "Prepping the tools…", "Chilling the glass…"],
  profile: ["Pulling up their story…", "One sec, boss…", "Checking the tab…"],
  search: ["Scanning the cellar…", "Looking around…", "Hold on, boss…"],
  hangover: ["Mixing the cure…", "Hydrate, hydrate…", "Hang tight, boss…"],
};

const DEFAULT_PHRASES = ["One moment, boss…", "Pouring…", "Almost there…"];

export function phrasesFor(section: string): string[] {
  return LOADING_PHRASES[section] ?? DEFAULT_PHRASES;
}
