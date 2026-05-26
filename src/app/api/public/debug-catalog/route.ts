import { NextResponse } from "next/server";
import { getLatestSpots } from "@/lib/metal-prices";
import { createTypedClient } from "@/lib/supabase/typed";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createTypedClient();

  const [spots, { data: products }] = await Promise.all([
    getLatestSpots(),
    supabase
      .from("products")
      .select("id, name, metal, weight_g, purity, markup_per_gram, markup_per_piece, cost_price, retail_markup_pct")
      .eq("active", true),
  ]);

  return NextResponse.json({
    spots,
    products: (products ?? []).map((p) => ({
      name: p.name,
      metal: p.metal,
      retail_markup_pct: (p as Record<string, unknown>).retail_markup_pct,
    })),
  });
}
