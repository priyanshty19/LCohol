import { NextResponse } from "next/server";
import { getDrinkBySlug } from "@/lib/drinks";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

// Drink by slug or uuid. Query + Decimal coercion live in getDrinkBySlug so the
// SSR page and this route return the identical shape.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const drink = await getDrinkBySlug(id);
    if (!drink) {
      return NextResponse.json({ error: "Drink not found" }, { status: 404 });
    }
    return NextResponse.json({ data: drink });
  } catch (err) {
    if (isPoolExhausted(err)) return poolBusyResponse();
    console.error("[api/drinks/[id]]", err);
    return NextResponse.json({ error: "Couldn't load drink." }, { status: 500 });
  }
}
