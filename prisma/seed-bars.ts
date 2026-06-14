import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type BarType = "PUB" | "BAR" | "BYOB" | "BREWERY" | "LOUNGE" | "CLUB";
type Price = "BUDGET" | "MID_RANGE" | "PREMIUM" | "LUXURY";
type Seed = {
  name: string;
  type: BarType;
  city: string;
  area: string;
  lat: number;
  lng: number;
  priceRange: Price;
  bestsellers: string[];
  description: string;
  rating: number;
};

// Curated starter set — real, well-known venues across the 5 launch cities.
const BARS: Seed[] = [
  // ── Delhi NCR ──
  { name: "Social (Hauz Khas Village)", type: "BAR", city: "Delhi NCR", area: "Hauz Khas Village, South Delhi", lat: 28.5535, lng: 77.1936, priceRange: "MID_RANGE", bestsellers: ["LIIT", "Sangria", "Trippy Trip cocktail"], description: "A buzzing work-by-day, party-by-night cafe-bar perched over the Hauz Khas lake with cheeky cocktails and a young crowd.", rating: 4.2 },
  { name: "PCO (Pass Code Only)", type: "BAR", city: "Delhi NCR", area: "Vasant Vihar, South Delhi", lat: 28.5602, lng: 77.1591, priceRange: "PREMIUM", bestsellers: ["Old Fashioned", "Whiskey Sour", "Negroni"], description: "A speakeasy hidden behind a secret password where bartenders craft serious classics in a 1920s-glam den.", rating: 4.4 },
  { name: "Toit Brewpub Gurgaon", type: "BREWERY", city: "Delhi NCR", area: "Sector 29, Gurugram", lat: 28.4682, lng: 77.0628, priceRange: "MID_RANGE", bestsellers: ["Toit Weiss", "Tintin Toit", "Basmati Blonde"], description: "Bangalore's cult microbrewery reborn in Gurgaon, pouring fresh house craft beer to a roaring after-work mob.", rating: 4.3 },
  { name: "Ministry of Beer", type: "BREWERY", city: "Delhi NCR", area: "Connaught Place, Central Delhi", lat: 28.6304, lng: 77.2177, priceRange: "MID_RANGE", bestsellers: ["Hefeweizen", "Belgian Wit", "House Lager"], description: "A sprawling multi-level brewpub in the heart of CP with live music and tanks of freshly brewed beer.", rating: 4.0 },
  { name: "Lord of the Drinks", type: "BAR", city: "Delhi NCR", area: "Connaught Place, Central Delhi", lat: 28.6326, lng: 77.2197, priceRange: "MID_RANGE", bestsellers: ["Beer towers", "Mojito", "Jagerbomb"], description: "A high-energy CP institution with a colossal bar and a perpetual party that spills into the night.", rating: 3.9 },
  { name: "Prankster", type: "LOUNGE", city: "Delhi NCR", area: "Sector 29, Gurugram", lat: 28.4665, lng: 77.064, priceRange: "PREMIUM", bestsellers: ["Molecular cocktails", "Smoky Old Monk", "Nostalgia mocktails"], description: "A whimsical theatrical lounge serving molecular cocktails amid retro Indian nostalgia.", rating: 4.1 },
  { name: "Cafe Delhi Heights (Cyber Hub)", type: "BAR", city: "Delhi NCR", area: "DLF Cyber Hub, Gurugram", lat: 28.4949, lng: 77.0886, priceRange: "MID_RANGE", bestsellers: ["Craft cocktails", "Sangria", "Frozen Margarita"], description: "An all-day buzzing bar-eatery in the Cyber Hub food mecca, packed with techies over loaded burgers and cocktails.", rating: 4.2 },
  { name: "Summer House Cafe", type: "LOUNGE", city: "Delhi NCR", area: "Hauz Khas Village, South Delhi", lat: 28.5542, lng: 77.1942, priceRange: "PREMIUM", bestsellers: ["Mojito", "Sangria pitchers", "House Sangria"], description: "A leafy rooftop lounge with sundowner views, live gigs and sangria that draws Delhi's boho weekend crowd.", rating: 4.1 },

  // ── Bangalore ──
  { name: "Toit Brewpub", type: "BREWERY", city: "Bangalore", area: "Indiranagar", lat: 12.9719, lng: 77.6412, priceRange: "MID_RANGE", bestsellers: ["Toit Weiss", "Tintin Toit", "Dark Knight Stout"], description: "Bangalore's beloved brick-and-timber microbrewery where the Indiranagar crowd queues till the taps run dry.", rating: 4.5 },
  { name: "The Permit Room", type: "BAR", city: "Bangalore", area: "Church Street", lat: 12.9748, lng: 77.6063, priceRange: "MID_RANGE", bestsellers: ["Filter Coffee Cocktail", "Old Monk Mojito", "Frozen Gola"], description: "A retro South Indian colonial-style bar splashing nostalgia and cheeky cocktails across Church Street.", rating: 4.4 },
  { name: "Arbor Brewing Company", type: "BREWERY", city: "Bangalore", area: "Magrath Road, Ashok Nagar", lat: 12.9682, lng: 77.6101, priceRange: "MID_RANGE", bestsellers: ["Bangalore Bliss Wit", "Phat Abbot Tripel", "Raging Elephant IPA"], description: "An American-rooted craft brewery off Brigade Road pouring bold, award-winning ales for beer geeks.", rating: 4.3 },
  { name: "Skyye Lounge", type: "LOUNGE", city: "Bangalore", area: "UB City, Vittal Mallya Road", lat: 12.9716, lng: 77.5963, priceRange: "LUXURY", bestsellers: ["Classic Martini", "Single Malts", "Signature Sangria"], description: "A glittering open-air rooftop atop UB City serving skyline views with top-shelf spirits.", rating: 4.2 },
  { name: "Pecos", type: "PUB", city: "Bangalore", area: "Rest House Road, Brigade Road", lat: 12.9719, lng: 77.6078, priceRange: "BUDGET", bestsellers: ["Draught Beer", "LIIT", "Rum & Coke"], description: "A legendary three-storey rock-n-roll dive plastered with classic-rock posters and the cheapest cold beer downtown.", rating: 4.1 },
  { name: "Big Pitcher", type: "BAR", city: "Bangalore", area: "Old Airport Road, Murugeshpalya", lat: 12.9591, lng: 77.6553, priceRange: "PREMIUM", bestsellers: ["Craft Beer Flights", "Smoky Whiskey Sour", "Big Pitcher Sangria"], description: "A sprawling double-height bar-restaurant with a vintage car centerpiece and lively weekend energy.", rating: 4.3 },
  { name: "The Black Rabbit", type: "BAR", city: "Bangalore", area: "Koramangala", lat: 12.9352, lng: 77.6245, priceRange: "MID_RANGE", bestsellers: ["Craft Cocktails", "Beer Towers", "Tequila Shots"], description: "A high-energy Koramangala haunt where neon, loud beats and value pitchers pull in the young crowd.", rating: 4.0 },
  { name: "Gilly's Restobar", type: "PUB", city: "Bangalore", area: "Koramangala", lat: 12.9344, lng: 77.626, priceRange: "BUDGET", bestsellers: ["Draught Beer", "Whiskey Pitchers", "Vodka Cocktails"], description: "A perennially packed multi-floor party pub famous for budget booze and a dance-floor that never quits.", rating: 3.9 },

  // ── Pune ──
  { name: "High Spirits Cafe", type: "BAR", city: "Pune", area: "Koregaon Park", lat: 18.5362, lng: 73.8933, priceRange: "MID_RANGE", bestsellers: ["LIIT", "Sangria pitchers", "Craft cocktails"], description: "Pune's legendary open-air party den where the dance floor never sleeps and the LIIT flows like water.", rating: 4.3 },
  { name: "The Beer Cafe", type: "PUB", city: "Pune", area: "Viman Nagar", lat: 18.5679, lng: 73.9143, priceRange: "MID_RANGE", bestsellers: ["Hoegaarden", "Stella Artois", "Beer towers"], description: "A bustling chain hangout with an endless tap list where every evening turns into a beer-tower marathon.", rating: 3.9 },
  { name: "Independence Brewing Company", type: "BREWERY", city: "Pune", area: "Koregaon Park", lat: 18.5421, lng: 73.8967, priceRange: "PREMIUM", bestsellers: ["Belgian Wit", "Four Grain Ale", "Three Monkeys IPA"], description: "Pune's pioneering craft microbrewery pouring small-batch ales beneath warm industrial-chic rafters.", rating: 4.4 },
  { name: "Effingut Brewerkz", type: "BREWERY", city: "Pune", area: "Baner", lat: 18.559, lng: 73.7868, priceRange: "PREMIUM", bestsellers: ["Hefeweizen", "Belgian Tripel", "Coffee Porter"], description: "A sprawling rooftop brewery where house-brewed Hefeweizen and live music keep Baner's crowd buzzing.", rating: 4.3 },
  { name: "Toit Pune", type: "BREWERY", city: "Pune", area: "Mundhwa", lat: 18.536, lng: 73.927, priceRange: "PREMIUM", bestsellers: ["Toit Weiss", "Tintin Toit", "Basmati Blonde"], description: "The Bangalore craft-beer icon's Pune outpost, packing rustic charm and cult-favourite Toit Weiss on tap.", rating: 4.4 },
  { name: "Penthouze Nightlife", type: "CLUB", city: "Pune", area: "Mundhwa", lat: 18.5347, lng: 73.9305, priceRange: "LUXURY", bestsellers: ["Signature martinis", "Whisky flights", "Champagne"], description: "A glittering high-rise nightclub where international DJs spin over skyline views and bottle-service glamour.", rating: 4.2 },
  { name: "Swig Bar & Eatery", type: "LOUNGE", city: "Pune", area: "Koregaon Park", lat: 18.5375, lng: 73.8948, priceRange: "PREMIUM", bestsellers: ["Asian-inspired cocktails", "Whisky sours", "Bao-paired tipples"], description: "A moody Pan-Asian lounge mixing inventive cocktails with dim-sum decadence in low golden light.", rating: 4.1 },
  { name: "Shisha Jazz Cafe", type: "LOUNGE", city: "Pune", area: "Koregaon Park", lat: 18.5398, lng: 73.8925, priceRange: "MID_RANGE", bestsellers: ["Mojitos", "Hookah platters", "House sangria"], description: "A leafy bohemian courtyard where mellow jazz, fragrant hookah and mojitos make the hours melt away.", rating: 4.2 },

  // ── Hyderabad ──
  { name: "Prost Brew Pub", type: "BREWERY", city: "Hyderabad", area: "Gachibowli", lat: 17.4426, lng: 78.3502, priceRange: "PREMIUM", bestsellers: ["Hefeweizen", "Belgian Witbier", "Dunkel"], description: "A sprawling German-style microbrewery where fresh house brews flow under industrial-chic rafters.", rating: 4.3 },
  { name: "Heart Cup Coffee & Bar", type: "BAR", city: "Hyderabad", area: "Jubilee Hills", lat: 17.4319, lng: 78.4073, priceRange: "MID_RANGE", bestsellers: ["LIIT", "Espresso Martini", "Sangria"], description: "A cozy coffee-house-by-day, buzzing cocktail-bar-by-night hideout beloved by Jubilee Hills regulars.", rating: 4.2 },
  { name: "Over The Moon Brew Company", type: "BREWERY", city: "Hyderabad", area: "Gachibowli", lat: 17.4399, lng: 78.3712, priceRange: "PREMIUM", bestsellers: ["Wheat Ale", "Honey Ale", "Stout"], description: "A lavish rooftop brewpub with craft beers and a skyline view that draws the after-work tech crowd.", rating: 4.2 },
  { name: "10 Downing Street", type: "PUB", city: "Hyderabad", area: "Begumpet", lat: 17.4435, lng: 78.4645, priceRange: "MID_RANGE", bestsellers: ["Draught Beer", "Whisky Sour", "Old Monk & Cola"], description: "Hyderabad's iconic British-themed pub, a decades-old institution for live music and late-night revelry.", rating: 4.0 },
  { name: "Xora", type: "LOUNGE", city: "Hyderabad", area: "Gachibowli", lat: 17.4239, lng: 78.3486, priceRange: "LUXURY", bestsellers: ["Smoked Old Fashioned", "Champagne cocktails", "Signature Martinis"], description: "An opulent rooftop sky-lounge with infinity-edge views, plush cabanas and a glamorous party crowd.", rating: 4.3 },
  { name: "Air Live", type: "LOUNGE", city: "Hyderabad", area: "Jubilee Hills", lat: 17.4226, lng: 78.4089, priceRange: "PREMIUM", bestsellers: ["Mojito", "Cosmopolitan", "Imported beer on tap"], description: "An open-air rooftop lounge with live bands and DJs, a perennial favorite for Jubilee Hills nightlife.", rating: 3.9 },
  { name: "Hideout Brewery", type: "BREWERY", city: "Hyderabad", area: "Hitech City", lat: 17.4501, lng: 78.3814, priceRange: "PREMIUM", bestsellers: ["Lager", "Apple Cider", "IPA"], description: "A multi-level Hitech City brewpub pairing house-fermented beers with a thumping dance floor upstairs.", rating: 4.1 },
  { name: "Block 22 by Tholi Eth", type: "BAR", city: "Hyderabad", area: "Banjara Hills", lat: 17.4156, lng: 78.4392, priceRange: "PREMIUM", bestsellers: ["Craft cocktails", "Single Malt flights", "Negroni"], description: "A sleek Banjara Hills bar-and-kitchen known for inventive cocktails and a see-and-be-seen vibe.", rating: 4.2 },

  // ── Chandigarh ──
  { name: "Hops n Grains", type: "BREWERY", city: "Chandigarh", area: "Sector 26, Madhya Marg", lat: 30.7283, lng: 76.8043, priceRange: "MID_RANGE", bestsellers: ["Hefeweizen", "Belgian Ale", "Apple Cider"], description: "Chandigarh's pioneering microbrewery where copper vats pour house-crafted ales into a buzzing Sector 26 nightscape.", rating: 4.2 },
  { name: "Brewestate", type: "BREWERY", city: "Chandigarh", area: "Sector 26, Madhya Marg", lat: 30.7291, lng: 76.8051, priceRange: "PREMIUM", bestsellers: ["Lager on Tap", "Wheat Beer", "LIIT"], description: "A sprawling rooftop brewery where neon, live music and fresh draught beer collide over Madhya Marg.", rating: 4.3 },
  { name: "The Willow Cafe Bar Kitchen", type: "BAR", city: "Chandigarh", area: "Sector 26, Leisure Valley", lat: 30.7269, lng: 76.8028, priceRange: "PREMIUM", bestsellers: ["Sangria", "Craft Cocktails", "Mojito"], description: "Leafy open-air lounge bar near Leisure Valley, perfect for unhurried evening cocktails under the trees.", rating: 4.4 },
  { name: "Lava Dome", type: "LOUNGE", city: "Chandigarh", area: "Sector 35-C", lat: 30.7256, lng: 76.7681, priceRange: "PREMIUM", bestsellers: ["Whisky Sour", "Martini", "Single Malts"], description: "A plush rooftop lounge in Sector 35 glowing over the city with skyline views and smooth pours.", rating: 4.0 },
  { name: "Peddlers Resto Bar", type: "BAR", city: "Chandigarh", area: "Sector 35-B", lat: 30.7239, lng: 76.7635, priceRange: "MID_RANGE", bestsellers: ["Vodka Cocktails", "Beer Towers", "Tequila Shots"], description: "A long-standing Sector 35 party haunt packing dancers in for loud nights and brimming beer towers.", rating: 3.9 },
  { name: "Score Sports Bar & Lounge", type: "PUB", city: "Chandigarh", area: "Sector 9-D", lat: 30.7445, lng: 76.7889, priceRange: "MID_RANGE", bestsellers: ["Draught Beer", "Old Fashioned", "Whisky"], description: "Big-screen sports pub in posh Sector 9 where match nights turn into roaring, beer-soaked celebrations.", rating: 4.1 },
  { name: "Backyard - The Restobar", type: "BAR", city: "Chandigarh", area: "Sector 7-C, Inner Market", lat: 30.7421, lng: 76.8005, priceRange: "MID_RANGE", bestsellers: ["Signature Cocktails", "Beer Pitchers", "Mojito"], description: "An easygoing Sector 7 restobar with a relaxed open-air vibe and a young, regular evening crowd.", rating: 4.0 },
  { name: "Boombox", type: "CLUB", city: "Chandigarh", area: "Elante Mall, Industrial Area Phase 1", lat: 30.7058, lng: 76.8013, priceRange: "PREMIUM", bestsellers: ["Cosmopolitan", "LIIT", "Premium Vodka"], description: "A high-energy club inside Elante where booming beats and bottle service draw Chandigarh's late-night set.", rating: 4.0 },
];

const CITY_STATE: Record<string, string> = {
  "Delhi NCR": "Delhi",
  Bangalore: "Karnataka",
  Pune: "Maharashtra",
  Hyderabad: "Telangana",
  Chandigarh: "Chandigarh",
};

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🍻 Seeding bars...");
  let n = 0;
  for (const b of BARS) {
    const state = /gurugram|gurgaon/i.test(b.area)
      ? "Haryana"
      : CITY_STATE[b.city] ?? b.city;
    const slug = slugify(`${b.name}-${b.city}`);
    await prisma.bar.upsert({
      where: { slug },
      update: {},
      create: {
        name: b.name,
        slug,
        type: b.type,
        city: b.city,
        state,
        address: b.area,
        lat: b.lat,
        lng: b.lng,
        priceRange: b.priceRange,
        rating: b.rating,
        bestsellers: b.bestsellers,
        description: b.description,
        isVerified: true,
      },
    });
    n++;
  }
  const byCity = await prisma.bar.groupBy({ by: ["city"], _count: { _all: true } });
  console.log(`✅ ${n} bars seeded.`);
  byCity.forEach((c) => console.log(`   ${c.city}: ${c._count._all}`));
}

main()
  .catch((e) => {
    console.error("❌ Bars seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
