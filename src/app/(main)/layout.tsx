import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ResponsibleDrinkingBanner } from "@/components/shared/responsible-drinking-banner";
import { GeoDisclaimer } from "@/components/shared/geo-disclaimer";
import { JamesWidget } from "@/components/james/james-widget";
import { FirstRunVibe } from "@/components/theme/first-run-vibe";

export const dynamic = "force-dynamic";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ban enforcement at the shell: a suspended account can read nothing.
  const user = await getCurrentUser();
  if (user?.isBanned) redirect("/denied");

  // First-run gate: a logged-in user who hasn't finished (or skipped) the taste
  // quiz is bounced to /onboarding, which lives OUTSIDE this (main) group so the
  // gate can't bounce it to itself.
  if (user && !user.profile?.onboardedAt) redirect("/onboarding");

  return (
    <div className="flex min-h-screen flex-col">
      {/* Dim-room floor for every route */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-ambient" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-aurora" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-grain opacity-50" />
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-20 md:pb-6">
        {children}
      </main>
      <ResponsibleDrinkingBanner />
      <GeoDisclaimer />
      <FirstRunVibe />
      {/* Mounted (no floating launcher) so the "Ask James" buttons on the bars
          and help pages can still summon the chat via the ask-james event. */}
      <JamesWidget showLauncher={false} />
      <MobileNav />
    </div>
  );
}
