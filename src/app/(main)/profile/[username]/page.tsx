import { notFound } from "next/navigation";
import { ProfileView } from "@/components/shared/profile-view";
import { getCurrentUser } from "@/lib/auth";
import { getProfileWithViewer } from "@/lib/profile";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const me = await getCurrentUser();
  const initialProfile = await getProfileWithViewer(username, me?.id ?? null);
  if (!initialProfile) notFound();

  return <ProfileView username={username} initialProfile={initialProfile} />;
}
