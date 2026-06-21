import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

// Circle now lives under the user's profile. Keep this path as a convenience
// redirect to your own profile (where the circle section renders).
export default async function CirclePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(`/profile/${user.profile?.username ?? ""}`);
}
