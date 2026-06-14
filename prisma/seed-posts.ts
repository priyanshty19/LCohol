import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

type PostType = "STORY" | "QUESTION" | "REVIEW" | "RECOMMENDATION" | "MEME";
type Seed = { author: string; type: PostType; title: string; body: string; score: number; image?: string };

// Curated Unsplash photos (verified to resolve); host allow-listed in next.config.
const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=70`;

// Real, characterful posts. Author = username. No em-dashes.
const POSTS: Seed[] = [
  {
    author: "shivam",
    type: "STORY",
    title: "The night Old Monk saved my Goa trip",
    body: "Rained out, no plans, three of us sulking on a Baga balcony. A random group two doors down had a bonfire and a bottle of Old Monk with Thumbs Up. Two hours later we were family. Old Monk does not just get you drunk, it gets you adopted. 10 on 10, would get rained out again.",
    score: 47,
    image: img("1514362545857-3bc16c4c7d1b"),
  },
  {
    author: "priyansh",
    type: "REVIEW",
    title: "Amrut Fusion is India's answer to a proper single malt",
    body: "Half the price of the imports and it holds its own. Warm spice, a little orchard fruit, a long finish that actually lingers. Neat with one ice cube. If you still think Indian whisky means hangover-in-a-bottle, this is your wake up call.",
    score: 38,
    image: img("1527281400683-1aae777175f8"),
  },
  {
    author: "hemang",
    type: "MEME",
    title: "Every Indian wedding bar, in one starter pack",
    body: "The cousin with his own hip flask. The uncle who orders soda strong and then dances like the lights are off. The aunty guarding the paneer tikka. The bartender who has given up. Peak culture, no notes.",
    score: 61,
    image: img("1543007630-9710e4a00a20"),
  },
  {
    author: "piyush",
    type: "QUESTION",
    title: "Best budget single malt under 5k?",
    body: "Want to graduate from blends without selling a kidney. Looking for something smooth-ish, not too peaty. Delhi prices. What is actually worth it right now?",
    score: 14,
  },
  {
    author: "shivam",
    type: "RECOMMENDATION",
    title: "Five bottles to start a home bar for under 10k",
    body: "Old Monk for the soul, a Magic Moments vodka for mixers, a Bombay Sapphire gin, an Amrut for the whisky shelf, and a bottle of decent sweet vermouth. That is negronis, highballs, and a desi old fashioned covered. Total stays under ten grand if you shop smart.",
    score: 29,
    image: img("1569529465841-dfecdab7503b"),
  },
  {
    author: "barfly_delhi",
    type: "STORY",
    title: "My first legal drink at 21 was gloriously anticlimactic",
    body: "Built it up for years. Walked into the bar, ordered a beer, the bartender did not even ask for ID. Sat there with a Kingfisher feeling absolutely nothing profound. Honestly perfect. Adulthood is just doing normal things and pretending it is a moment.",
    score: 22,
    image: img("1438557068880-c5f474830377"),
  },
  {
    author: "priyansh",
    type: "REVIEW",
    title: "Bira 91 White is basically my love language",
    body: "Cloudy, citrusy, low bitterness, goes down too easy on a Bangalore evening. Not a serious beer-geek pick but I am not a serious person on a Friday. Pairs with literally everything fried.",
    score: 17,
    image: img("1535958636474-b021ee887b13"),
  },
  {
    author: "hemang",
    type: "QUESTION",
    title: "Hungover before a Monday standup, what actually works?",
    body: "Asking for science, not vibes. Nimbu paani plus electrolytes has saved me before. Does the greasy breakfast thing actually help or is it placebo? Drop your real protocols.",
    score: 9,
  },
  {
    author: "piyush",
    type: "MEME",
    title: "We pregame at home and never, ever learn",
    body: "Plan: two drinks at home to save money. Reality: arrive at the bar already gone, spend the same money anyway, and now also have a story we cannot tell at work. Every single weekend.",
    score: 44,
    image: img("1510626176961-4b57d4fbad03"),
  },
];

async function main() {
  console.log("📝 Seeding posts...");
  let n = 0;
  for (const p of POSTS) {
    const profile = await prisma.profile.findFirst({
      where: { username: p.author },
      select: { userId: true },
    });
    if (!profile) {
      console.warn(`  skip "${p.title}" (no user @${p.author})`);
      continue;
    }
    const existing = await prisma.post.findFirst({
      where: { title: p.title },
      select: { id: true },
    });
    if (existing) {
      await prisma.post.update({
        where: { id: existing.id },
        data: { score: p.score, imageUrl: p.image ?? null },
      });
    } else {
      await prisma.post.create({
        data: {
          authorId: profile.userId,
          title: p.title,
          body: p.body,
          postType: p.type,
          score: p.score,
          imageUrl: p.image ?? null,
        },
      });
    }
    n++;
  }
  const total = await prisma.post.count({ where: { isDeleted: false } });
  console.log(`✅ ${n} posts seeded. Feed now has ${total} posts.`);
}

main()
  .catch((e) => {
    console.error("❌ Post seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
