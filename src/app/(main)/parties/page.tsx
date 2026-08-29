import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getPartiesFor } from "@/lib/parties";
import { PartiesView } from "@/components/party/parties-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Parties" };

export default async function PartiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { hosting, invited, open } = await getPartiesFor(user.id);
  return <PartiesView hosting={hosting} invited={invited} open={open} />;
}
