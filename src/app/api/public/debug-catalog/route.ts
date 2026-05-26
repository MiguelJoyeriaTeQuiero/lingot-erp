import { NextResponse } from "next/server";
import { getLatestSpots } from "@/lib/metal-prices";
import { computeUnitPrice } from "@/lib/pricing";
import { createTypedClient } from "@/lib/supabase/typed";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createTypedClient();

  const [spots, companyRes, { data: products }] = await Promise.all([
    getLatestSpots(),
    supabase.from("company_settings").select("metal_markup_pct").eq("id", 1).maybeSingle(),
    supabase
      .from("products")
      .select("id, name, metal, weight_g, purity, markup_per_gram, markup_per_piece, cost_price, retail_markup_pct")
      .eq("active", true),
  ]);

  const globalMarkupPct = Number((companyRes.data as Record<string, unknown> | null)?.metal_markup_pct ?? 4);

  return NextResponse.json({
    spots,
    globalMarkupPct,
    products: (products ?? []).map((p) => {
      const pr = p as Record<string, unknown>;
      const spot = spots[p.metal as "oro" | "plata"]?.price_eur_per_g ?? null;
      const wholesalePrice = spot != null
        ? computeUnitPrice({
            weight_g: Number(p.weight_g),
            purity: Number(p.purity),
            metal: p.metal as "oro" | "plata",
            markup_per_gram: Number(p.markup_per_gram),
            markup_per_piece: Number(p.markup_per_piece),
            cost_price: Number(pr.cost_price ?? 0),
            spot_eur_per_g: spot,
            global_markup_pct: globalMarkupPct,
          })
        : null;
      const retailMarkupPct = Number(pr.retail_markup_pct ?? 0);
      const retailPrice = wholesalePrice != null && retailMarkupPct > 0
        ? Math.round(wholesalePrice * (1 + retailMarkupPct / 100) * 100) / 100
        : null;
      return {
        name: p.name,
        metal: p.metal,
        weight_g: p.weight_g,
        purity: p.purity,
        markup_per_gram: p.markup_per_gram,
        markup_per_piece: p.markup_per_piece,
        cost_price: pr.cost_price,
        retail_markup_pct: pr.retail_markup_pct,
        spot,
        wholesalePrice,
        retailPrice,
      };
    }),
  });
}
