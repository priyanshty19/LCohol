import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { OnboardingQuiz } from "@/components/onboarding/onboarding-quiz";
import { safeReturnTo } from "@/lib/safe-return-to";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Personalise your taste",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()]);
  const returnTo = safeReturnTo(params.returnTo);

  // Must be signed in to onboard; already-onboarded users go straight to the feed.
  if (!user) {
    const onboardingReturnTo = `/onboarding?returnTo=${encodeURIComponent(returnTo)}`;
    redirect(`/login?returnTo=${encodeURIComponent(onboardingReturnTo)}`);
  }
  if (user.isBanned) redirect("/denied");
  if (user.profile?.onboardedAt) redirect(returnTo);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-ambient" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-aurora" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-grain opacity-50" />
      <OnboardingQuiz username={user.profile?.username ?? "friend"} returnTo={returnTo} />
    </main>
  );
}
