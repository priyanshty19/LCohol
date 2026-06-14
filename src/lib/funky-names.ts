// Funky pseudonym generator. adjectives × nouns gives a 12,000+ name space
// (drinking-culture + desi + playful flavours). Users get a suggestion they can
// shuffle or overwrite. Pure function, used on the signup form.

const ADJECTIVES = [
  "Tipsy", "Boozy", "Velvet", "Midnight", "Smoky", "Salty", "Neon", "Drunken",
  "Whiskey", "Rummy", "Foamy", "Fizzy", "Hazy", "Mellow", "Spicy", "Sour",
  "Sweet", "Bitter", "Golden", "Crimson", "Dizzy", "Wobbly", "Sneaky", "Cheeky",
  "Royal", "Desi", "Masala", "Tandoori", "Filmy", "Jugaad", "Patiala", "Bindaas",
  "Jhakaas", "Fennel", "Saffron", "Mango", "Jamun", "Litchi", "Guava", "Frosty",
  "Stormy", "Wild", "Lazy", "Groovy", "Funky", "Jazzy", "Swanky", "Dapper",
  "Suave", "Reckless", "Restless", "Moonlit", "Starry", "Electric", "Cosmic",
  "Rogue", "Loose", "Tangy", "Zesty", "Bubbly", "Mystic", "Vintage", "Rusty",
  "Hoppy", "Malty", "Oaky", "Peaty", "Silky", "Plush", "Chrome", "Sapphire",
  "Ruby", "Amber", "Crystal", "Maverick", "Nimble", "Witty", "Sleepy", "Grumpy",
  "Jolly", "Feral", "Sassy", "Posh", "Shady", "Spunky", "Quirky", "Dreamy",
  "Brassy", "Foxy", "Snazzy", "Toasty", "Sugary", "Minty", "Peppy", "Glitzy",
  "Lush", "Bold", "Sly", "Regal", "Nutty", "Cheery", "Breezy",
  "Frothy", "Glossy", "Mauve", "Olive", "Scarlet", "Indigo", "Coral", "Dusky",
];

const NOUNS = [
  "Monk", "Bandit", "Peg", "Goblin", "Maharaja", "Nawab", "Cobra", "Tiger",
  "Peacock", "Falcon", "Phoenix", "Mongoose", "Rascal", "Rebel", "Wanderer",
  "Nomad", "Pirate", "Jester", "Maestro", "Hustler", "Drifter", "Dreamer",
  "Scoundrel", "Knight", "Baron", "Duke", "Tycoon", "Pundit", "Ustad", "Bawarchi",
  "Theka", "Pataka", "Jugaadu", "Gabbar", "Mogambo", "Babu", "Seth", "Panther",
  "Wolf", "Fox", "Owl", "Raven", "Sparrow", "Stallion", "Bull", "Buffalo",
  "Camel", "Elephant", "Llama", "Otter", "Badger", "Hawk", "Heron", "Crane",
  "Marlin", "Shark", "Whale", "Dolphin", "Octopus", "Walrus", "Penguin", "Yeti",
  "Djinn", "Phantom", "Specter", "Comet", "Meteor", "Nebula", "Quasar", "Vortex",
  "Mixer", "Shaker", "Tumbler", "Goblet", "Flask", "Barrel", "Cask", "Keg",
  "Olive", "Cherry", "Lime", "Twist", "Splash", "Rinse", "Garnish", "Highball",
  "Sour", "Fizz", "Punch", "Toddy", "Julep", "Sling", "Smash", "Spritz",
  "Maharani", "Begum", "Sultan", "Rani", "Raja", "Chacha", "Mamu", "Bhaiya",
  "Yaar", "Dost", "Boss", "Captain", "Chief", "Legend", "Rockstar", "Ninja",
];

export function generateFunkyName(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${a}${n}`;
}

/** Count of DISTINCT two-word combinations (dedupes defensively). */
export const FUNKY_NAME_SPACE = new Set(ADJECTIVES).size * new Set(NOUNS).size;
