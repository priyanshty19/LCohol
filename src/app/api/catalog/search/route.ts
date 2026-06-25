import { NextResponse } from "next/server";
import { searchCatalog } from "@/lib/james/search";

// GET /api/catalog/search?q=negroni → merged drink+cocktail matches ({kind,id,name,...}).
// Reuses James's searchCatalog (the existing unified search) so the party picker
// and any future global catalog search share one ranking.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ data: { results: [] } });
  const { results } = await searchCatalog(q);
  return NextResponse.json({ data: { results } });
}
