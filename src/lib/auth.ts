import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const IS_DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

const DEV_USER = {
  id: "dev-user-id",
  email: "dev@sipstories.local",
};

/**
 * Get the current authenticated user's DB record.
 * In dev mode, auto-creates and returns a local test user.
 */
export async function getCurrentUser() {
  if (IS_DEV_MODE) {
    // Find or create the dev user
    let user = await prisma.user.findUnique({
      where: { authId: DEV_USER.id },
      include: { profile: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          authId: DEV_USER.id,
          email: DEV_USER.email,
          dob: new Date("2000-01-01"),
          isVerified: true,
          profile: {
            create: {
              username: "devuser",
              displayName: "Dev User",
              bio: "Local development account",
              karma: 42,
            },
          },
        },
        include: { profile: true },
      });
    }

    return user;
  }

  // Production: use Supabase auth
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  return prisma.user.findUnique({
    where: { authId: authUser.id },
    include: { profile: true },
  });
}
