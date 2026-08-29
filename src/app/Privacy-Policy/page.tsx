import PrivacyPage from "@/app/(main)/compliance/privacy/page";

export { metadata } from "@/app/(main)/compliance/privacy/page";

export default function PublicPrivacyPage() {
  return (
    <main className="relative min-h-screen px-5 py-10">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-ambient" />
      <PrivacyPage />
    </main>
  );
}
