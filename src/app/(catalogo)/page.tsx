import { getLatestSpots } from "@/lib/metal-prices";
import { computeCatalogPricing } from "@/lib/pricing";
import { createTypedClient } from "@/lib/supabase/typed";
import { LabExperience, type LabProduct } from "./lab-experience";
import { LabComingSoon } from "./lab-coming-soon";
import { LabSessionProvider } from "./lab-session";
import { loadLabViewer } from "./lab-viewer";
import type { LabSerie } from "./lab-market-chart";
import { HOME_DESCRIPTION, HOME_TITLE, JsonLd, faqLd, pageMeta, siteGraphLd } from "./lab-seo";

export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title:       { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  path:        "/",
});

export default async function CatalogoPage() {
  const supabase = createTypedClient();

  // PostgREST corta en 1.000 filas por consulta. Con registro horario de dos
  // metales son 48 filas al día, así que el histórico se pide por ventanas de
  // 18 días (864 filas) en paralelo. El solape entre ventanas es inofensivo:
  // el resumen diario se queda con un punto por jornada.
  const VENTANA = 18;
  const VENTANAS = 7;
  const historyPages = Array.from({ length: VENTANAS }, (_, k) => {
    const hasta = new Date();
    hasta.setDate(hasta.getDate() - k * VENTANA);
    const desde = new Date(hasta);
    desde.setDate(desde.getDate() - VENTANA);
    return supabase
      .from("metal_prices")
      .select("metal, price_eur_per_g, fetched_at")
      .gte("fetched_at", desde.toISOString())
      .lte("fetched_at", hasta.toISOString())
      .order("fetched_at", { ascending: true });
  });

  const [companyRes, productsRes, spots, viewer, ...historyRes] = await Promise.all([
    supabase
      .from("company_settings")
      .select("trade_name, catalog_enabled, metal_markup_pct")
      .eq("id", 1)
      .maybeSingle(),
    supabase
      .from("products")
      .select(
        "id, name, sku, metal, weight_g, purity, markup_per_gram, markup_per_piece, cost_price, retail_markup_pct, igic_rate, image_urls, active, stock_current, catalog_out_of_stock"
      )
      .eq("active", true)
      .order("name"),
    getLatestSpots(),
    loadLabViewer(supabase),
    ...historyPages,
  ]);

  const company   = companyRes.data;
  const brandName = (company as { trade_name?: string } | null)?.trade_name ?? "Lingot";
  const { session, isAdmin, orders, documents } = viewer;

  if (!(company?.catalog_enabled ?? false) && !isAdmin) {
    return (
      <>
        <JsonLd data={siteGraphLd()} />
        <LabComingSoon brandName={brandName} />
      </>
    );
  }

  type PriceRow = { metal: string; price_eur_per_g: number; fetched_at: string };
  const historial = (historyRes as { data: PriceRow[] | null }[])
    .flatMap((r) => r.data ?? [])
    .sort((a, b) => a.fetched_at.localeCompare(b.fetched_at));

  /** Un punto por día y metal: el último registro de cada jornada. */
  function serie(metal: "oro" | "plata"): LabSerie {
    const porDia = new Map<string, number>();
    for (const row of historial) {
      if (row.metal !== metal) continue;
      porDia.set(row.fetched_at.slice(0, 10), Number(row.price_eur_per_g));
    }
    return [...porDia.entries()].map(([t, p]) => ({ t, p }));
  }

  const globalMarkupPct = Number(
    (company as { metal_markup_pct?: number } | null)?.metal_markup_pct ?? 4
  );

  const products: LabProduct[] = (productsRes.data ?? []).map((p) => {
    const spot = spots[p.metal as "oro" | "plata"]?.price_eur_per_g ?? null;
    const pricing =
      spot != null
        ? computeCatalogPricing({
            weight_g:          Number(p.weight_g),
            purity:            Number(p.purity),
            metal:             p.metal as "oro" | "plata",
            markup_per_gram:   Number(p.markup_per_gram),
            markup_per_piece:  Number(p.markup_per_piece),
            cost_price:        Number((p as typeof p & { cost_price?: number }).cost_price ?? 0),
            retail_markup_pct: Number((p as typeof p & { retail_markup_pct?: number }).retail_markup_pct ?? 0),
            igic_rate:         (p as typeof p & { igic_rate?: number | null }).igic_rate ?? 0,
            spot_eur_per_g:    spot,
            global_markup_pct: globalMarkupPct,
          })
        : null;

    const images = (p as typeof p & { image_urls?: string[] }).image_urls ?? [];

    return {
      id:       p.id,
      name:     p.name,
      sku:      p.sku,
      metal:    p.metal,
      weight_g: Number(p.weight_g),
      purity:   Number(p.purity),
      price:    session?.isWholesale ? (pricing?.wholesaleWithIgic ?? null) : (pricing?.retail ?? null),
      image:    images[0] ?? null,
      inStock:
        Number(p.stock_current) > 0 &&
        !(p as typeof p & { catalog_out_of_stock?: boolean }).catalog_out_of_stock,
    };
  });

  return (
    <LabSessionProvider session={session} orders={orders} documents={documents}>
      {/* Tienda, web y las preguntas frecuentes que se ven en la portada */}
      <JsonLd data={siteGraphLd([faqLd()])} />
      <LabExperience
        brandName={brandName}
        products={products}
        spots={{
          oro:   spots.oro?.price_eur_per_g   ?? null,
          plata: spots.plata?.price_eur_per_g ?? null,
        }}
        history={{ oro: serie("oro"), plata: serie("plata") }}
      />
    </LabSessionProvider>
  );
}
