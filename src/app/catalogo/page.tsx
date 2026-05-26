import { getLatestSpots } from "@/lib/metal-prices";
import { computeUnitPrice } from "@/lib/pricing";
import { createTypedClient } from "@/lib/supabase/typed";
import { CatalogLanding } from "./catalog-landing";
import { CatalogHeroWebGL } from "./catalog-hero-webgl";
import { BLOG_POSTS } from "./blog/data";

export const dynamic = "force-dynamic";

export default async function CatalogoPage() {
  const supabase = createTypedClient();

  const [companyRes, productsRes, spots, { data: { user } }] = await Promise.all([
    supabase
      .from("company_settings")
      .select("trade_name, legal_name, catalog_enabled, metal_markup_pct")
      .eq("id", 1)
      .maybeSingle(),
    supabase
      .from("products")
      .select(
        "id, name, sku, description, metal, weight_g, purity, markup_per_gram, markup_per_piece, cost_price, retail_markup_pct, igic_rate, image_urls, active, stock_current, catalog_out_of_stock"
      )
      .eq("active", true)
      .order("name"),
    getLatestSpots(),
    supabase.auth.getUser(),
  ]);

  const company         = companyRes.data;
  const catalogEnabled  = company?.catalog_enabled ?? false;
  const globalMarkupPct = Number(
    (company as { metal_markup_pct?: number } | null)?.metal_markup_pct ?? 4
  );

  let isAdmin     = false;
  let isWholesale = false;
  let userName    = "";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_wholesale, full_name")
      .eq("id", user.id)
      .single();
    isAdmin     = profile?.role === "admin";
    isWholesale = (profile as { is_wholesale?: boolean } | null)?.is_wholesale ?? false;
    if (profile?.role === "admin" || profile?.role === "contabilidad") isWholesale = true;
    userName = (profile as { full_name?: string } | null)?.full_name
      ?? (user as unknown as { user_metadata?: { full_name?: string } }).user_metadata?.full_name
      ?? user.email?.split("@")[0]
      ?? "";
  }

  // ── Coming soon ────────────────────────────────────────────────────────────
  if (!catalogEnabled && !isAdmin) {
    return (
      <div
        className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 text-center"
        style={{ background: "#F0E9DA" }}
      >
        <CatalogHeroWebGL />
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 60% 55% at 50% 50%, rgba(240,233,218,0.30), rgba(240,233,218,0.88))", zIndex: 2 }} />
        <div aria-hidden className="catalog-grain-overlay" />
        <div className="relative flex flex-col items-center" style={{ zIndex: 3 }}>
          <div className="mb-8 inline-flex items-center rounded-full px-4 py-1.5"
            style={{ background: "rgba(10,31,43,0.05)", border: "1px solid rgba(10,31,43,0.12)" }}>
            <span className="font-mono text-[9px] uppercase tracking-[0.42em]"
              style={{ color: "rgba(10,31,43,0.45)" }}>Próximamente</span>
          </div>
          <h1 className="select-none font-serif font-light italic leading-none tracking-[-0.04em]"
            style={{ fontSize: "clamp(80px, 15vw, 180px)", color: "#0a1f2b" }}>
            Lingot
          </h1>
          <p className="mt-8 font-serif italic"
            style={{ fontSize: "clamp(14px,2.2vw,18px)", color: "rgba(10,31,43,0.38)", letterSpacing: "0.03em" }}>
            Metales preciosos · Alta pureza
          </p>
        </div>
      </div>
    );
  }

  // ── Compute prices ─────────────────────────────────────────────────────────
  const products = (productsRes.data ?? []).map((p) => {
    const spot = spots[p.metal as "oro" | "plata"]?.price_eur_per_g ?? null;
    const wholesalePrice =
      spot != null
        ? computeUnitPrice({
            weight_g:          Number(p.weight_g),
            purity:            Number(p.purity),
            metal:             p.metal as "oro" | "plata",
            markup_per_gram:   Number(p.markup_per_gram),
            markup_per_piece:  Number(p.markup_per_piece),
            cost_price:        Number((p as typeof p & { cost_price?: number }).cost_price ?? 0),
            spot_eur_per_g:    spot,
            global_markup_pct: globalMarkupPct,
          })
        : null;

    const retailMarkupPct = Number(
      (p as typeof p & { retail_markup_pct?: number }).retail_markup_pct ?? 0
    );
    const igicRate = Number(
      (p as typeof p & { igic_rate?: number | null }).igic_rate ?? 0
    );
    const applyIgic = (price: number) =>
      igicRate > 0
        ? Math.round(price * (1 + igicRate / 100) * 100) / 100
        : price;

    const wholesaleFinal = wholesalePrice != null ? applyIgic(wholesalePrice) : null;
    const retailPrice =
      wholesalePrice != null && retailMarkupPct > 0
        ? applyIgic(Math.round(wholesalePrice * (1 + retailMarkupPct / 100) * 100) / 100)
        : null;

    return {
      id:          p.id,
      name:        p.name,
      sku:         p.sku,
      description: p.description,
      metal:       p.metal,
      weight_g:    Number(p.weight_g),
      purity:      Number(p.purity),
      image_urls:  (p as typeof p & { image_urls?: string[] }).image_urls ?? [],
      price:       isWholesale ? wholesaleFinal : (p.metal === "plata" ? retailPrice : null),
      inStock:
        Number(p.stock_current) > 0 &&
        !(p as typeof p & { catalog_out_of_stock?: boolean }).catalog_out_of_stock,
    };
  });

  const brandName   = (company as { trade_name?: string } | null)?.trade_name ?? "Lingot";
  const year        = new Date().getFullYear();
  const latestPosts = BLOG_POSTS.slice(0, 3);

  return (
    <CatalogLanding
      products={products}
      brandName={brandName}
      year={year}
      latestPosts={latestPosts}
      isLoggedIn={!!user}
      isWholesale={isWholesale}
      isAdmin={isAdmin}
      catalogEnabled={catalogEnabled}
      userName={userName}
    />
  );
}
