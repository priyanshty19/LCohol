import { FeedView } from "@/components/feed/feed-view";
import { HomeSidebar } from "@/components/shared/home-sidebar";

export default function FeedPage() {
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
