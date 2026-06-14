import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { OnboardingQuiz } from "@/components/onboarding/onboarding-quiz";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  // Must be signed in to onboard; already-onboarded users go straight to the feed.
  if (!user) redirect("/login");
  if (user.isBanned) redirect("/denied");
  if (user.profile?.onboardedAt) redirect("/");

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-ambient" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-aurora" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-grain opacity-50" />
      <OnboardingQuiz username={user.profile?.username ?? "friend"} />
    </main>
  );
}
