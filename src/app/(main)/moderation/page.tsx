import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isModerator } from "@/lib/rbac";
import { ModQueue } from "@/components/admin/mod-queue";

export const dynamic = "force-dynamic";

export default async function ModerationPage() {
  const user = await getCurrentUser();
  if (!user || !isModerator(user.role)) redirect("/");
  return <ModQueue />;
}
