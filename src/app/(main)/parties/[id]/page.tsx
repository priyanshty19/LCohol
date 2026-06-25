import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPartyDetail } from "@/lib/parties";
import { PartyDetail } from "@/components/party/party-detail";

export const dynamic = "force-dynamic";

export default async function PartyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const party = await getPartyDetail(id);
  if (!party) notFound();

  const isHost = party.authorId === user.id;
  const myInvite = party.invites.find((i) => i.invitedUserId === user.id);
  if (!isHost && !myInvite) notFound(); // only host + invited guests

  return (
    <PartyDetail party={party} isHost={isHost} myRsvp={myInvite?.rsvp ?? null} meId={user.id} />
  );
}
