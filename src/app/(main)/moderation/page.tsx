import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isPoolExhausted } from "@/lib/db-errors";
import { isModerator } from "@/lib/rbac";
import { ModQueue } from "@/components/admin/mod-queue";

export const dynamic = "force-dynamic";

export default async function ModerationPage() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (err) {
    if (!isPoolExhausted(err)) throw err;
    return (
      <div className="glass-panel rounded-xl p-6 text-sm text-muted-foreground">
        Moderation is temporarily busy. Please refresh in a moment.
      </div>
    );
  }
  if (!user || !isModerator(user.role)) redirect("/");
  return <ModQueue />;
}
