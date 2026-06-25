import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getConnectionUserIds } from "@/lib/connections";
import { getPostsFeed } from "@/lib/posts";
import { FeedView } from "@/components/feed/feed-view";
import { HomeSidebar } from "@/components/shared/home-sidebar";

export default async function FeedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Server-fetch the default "for-you" feed (with the viewer's circle for CIRCLE
  // visibility + affinity) so the first posts are in the SSR HTML — no client
  // waterfall, and the seeded sort matches the default tab (no double fetch).
  const connectionIds = await getConnectionUserIds(user.id);
  const initialFeed = await getPostsFeed({ sort: "for-you", viewerId: user.id, connectionIds });

  return (
    <div className="flex gap-8">
      <div className="min-w-0 flex-1">
        <FeedView initialFeed={initialFeed} />
      </div>
      <aside className="hidden w-72 flex-shrink-0 lg:block">
        <HomeSidebar />
      </aside>
    </div>
  );
}
