import TermsPage from "@/app/(main)/compliance/terms/page";

export { metadata } from "@/app/(main)/compliance/terms/page";

export default function PublicTermsPage() {
  return (
    <main className="relative min-h-screen px-5 py-10">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-ambient" />
      <TermsPage />
    </main>
  );
}
