import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// The 4 global admins. They sign in through OTP; their referral codes are the
// root invites for the whole platform.
const ADMINS = [
  { email: "priyansht1999@gmail.com", username: "priyansh", displayName: "Priyansh" },
  { email: "shauryashivam38@gmail.com", username: "shivam", displayName: "Shivam" },
  { email: "piyushdtu23@gmail.com", username: "piyush", displayName: "Piyush" },
  { email: "hemangsinha.social@gmail.com", username: "hemang", displayName: "Hemang" },
];

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function code(): string {
  let s = "SIP";
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

async function main() {
  console.log("👑 Seeding admins...\n");

  for (const a of ADMINS) {
    const email = a.email.toLowerCase();
    const existing = await prisma.user.findFirst({
      where: { email },
      include: { profile: true },
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          role: "ADMIN",
          isVerified: true,
          consentedAt: existing.consentedAt ?? new Date(),
          referralCode: existing.referralCode ?? code(),
          ...(existing.profile
            ? {}
            : { profile: { create: { username: a.username, displayName: a.displayName } } }),
        },
      });
      console.log(`  ↻ updated ${email}`);
    } else {
      await prisma.user.create({
        data: {
          authId: email,
          email,
          dob: new Date("2000-01-01"),
          isVerified: true,
          consentedAt: new Date(),
          role: "ADMIN",
          referralCode: code(),
          profile: { create: { username: a.username, displayName: a.displayName } },
        },
      });
      console.log(`  + created ${email}`);
    }
  }

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { email: true, referralCode: true },
    orderBy: { email: "asc" },
  });
  console.log("\n✅ Admins ready. Referral codes:");
  for (const a of admins) console.log(`   ${a.email}  →  ${a.referralCode}`);
}

main()
  .catch((e) => {
    console.error("❌ Admin seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
