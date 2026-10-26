import { getLatestSpots } from "@/lib/metal-prices";
import { computeCatalogPricing } from "@/lib/pricing";
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
        className="lg-scope relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 text-center"
        style={{ background: "radial-gradient(120% 90% at 50% 8%, #0f4a5c 0%, #0a3746 42%, #06272f 100%)" }}
      >
        <CatalogHeroWebGL />
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(140% 120% at 50% 45%, transparent 40%, rgba(4,20,26,0.6) 100%)", zIndex: 2 }} />
        <div aria-hidden className="lg-grain" />
        <div className="relative flex flex-col items-center" style={{ zIndex: 3 }}>
          <div className="mb-8 inline-flex items-center rounded-full px-4 py-1.5"
            style={{ background: "rgba(238,242,244,0.05)", border: "1px solid rgba(238,242,244,0.14)" }}>
            <span className="lg-label" style={{ fontSize: "9px", letterSpacing: "0.42em", color: "rgba(228,200,143,0.72)" }}>Próximamente</span>
          </div>
          <h1 className="lg-display select-none" style={{ fontSize: "clamp(80px, 15vw, 200px)", color: "var(--lg-light)", fontWeight: 300 }}>
            Lingot
          </h1>
          <p className="lg-label mt-8" style={{ fontSize: "clamp(11px,1.6vw,13px)", letterSpacing: "0.4em", color: "var(--lg-light-dim)" }}>
            Metales preciosos · Alta pureza
          </p>
        </div>
      </div>
    );
  }

  // ── Compute prices ─────────────────────────────────────────────────────────
  const products = (productsRes.data ?? []).map((p) => {
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

    return {
      id:          p.id,
      name:        p.name,
      sku:         p.sku,
      description: p.description,
      metal:       p.metal,
      weight_g:    Number(p.weight_g),
      purity:      Number(p.purity),
      image_urls:  (p as typeof p & { image_urls?: string[] }).image_urls ?? [],
      price:       isWholesale ? (pricing?.wholesaleWithIgic ?? null) : (pricing?.retail ?? null),
      inStock:
        Number(p.stock_current) > 0 &&
        !(p as typeof p & { catalog_out_of_stock?: boolean }).catalog_out_of_stock,
    };
  });

  const brandName   = (company as { trade_name?: string } | null)?.trade_name ?? "Lingot";
  const year        = new Date().getFullYear();
  const latestPosts = BLOG_POSTS.slice(0, 3);

  const spotsForHero = {
    oro:   spots.oro?.price_eur_per_g   ?? null,
    plata: spots.plata?.price_eur_per_g ?? null,
  };

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
      spots={spotsForHero}
    />
  );
}
