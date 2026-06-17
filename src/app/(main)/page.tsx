import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { FeedView } from "@/components/feed/feed-view";
import { HomeSidebar } from "@/components/shared/home-sidebar";

export default async function FeedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex gap-8">
      <div className="min-w-0 flex-1">
        <FeedView />
      </div>
      <aside className="hidden w-72 flex-shrink-0 lg:block">
        <HomeSidebar />
      </aside>
    </div>
  );
}
