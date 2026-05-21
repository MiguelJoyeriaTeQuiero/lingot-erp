import { getLatestSpots } from "@/lib/metal-prices";
import { computeUnitPrice } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";
import { createTypedClient } from "@/lib/supabase/typed";
import { CatalogGrid } from "./catalog-grid";
import { CatalogLoginButton } from "./catalog-login";
import { CatalogScrollTransition } from "./catalog-scroll-transition";
import { MisReservas } from "./mis-reservas";

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
        "id, name, sku, description, metal, weight_g, purity, markup_per_gram, markup_per_piece, cost_price, image_urls, active, stock_current, catalog_out_of_stock"
      )
      .eq("active", true)
      .order("name"),
    getLatestSpots(),
    supabase.auth.getUser(),
  ]);

  const company = companyRes.data;
  const catalogEnabled = company?.catalog_enabled ?? false;
  const globalMarkupPct = Number(
    (company as { metal_markup_pct?: number } | null)?.metal_markup_pct ?? 4
  );

  let isAdmin = false;
  let isWholesale = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_wholesale")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
    isWholesale = (profile as { is_wholesale?: boolean } | null)?.is_wholesale ?? false;
    // Usuarios ERP también ven precio mayorista
    if (profile?.role === "admin" || profile?.role === "contabilidad") {
      isWholesale = true;
    }
  }

  // ── Coming soon ──────────────────────────────────────────────────────────
  if (!catalogEnabled && !isAdmin) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-primary px-6 text-center">
        <div className="grain-overlay" />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 h-[700px] w-[700px] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(184,138,61,0.15), transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div className="relative z-10 flex flex-col items-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.5em] text-gold">
            Próximamente
          </span>
          <h1
            className="mt-8 select-none font-display font-light leading-none tracking-[-0.04em] text-surface-raised"
            style={{ fontSize: "clamp(64px, 13vw, 160px)" }}
          >
            LINGOT
          </h1>
          <div className="mx-auto mt-8 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />
          <p className="mt-8 max-w-xs font-mono text-[12px] uppercase tracking-[0.2em] text-surface-raised/30">
            Nuestro catálogo estará disponible muy pronto
          </p>
        </div>
      </div>
    );
  }

  // ── Compute prices ───────────────────────────────────────────────────────
  const products = (productsRes.data ?? []).map((p) => {
    const spot = spots[p.metal as "oro" | "plata"]?.price_eur_per_g ?? null;
    const wholesalePrice =
      spot != null
        ? computeUnitPrice({
            weight_g: Number(p.weight_g),
            purity: Number(p.purity),
            metal: p.metal as "oro" | "plata",
            markup_per_gram: Number(p.markup_per_gram),
            markup_per_piece: Number(p.markup_per_piece),
            cost_price: Number(
              (p as typeof p & { cost_price?: number }).cost_price ?? 0
            ),
            spot_eur_per_g: spot,
            global_markup_pct: globalMarkupPct,
          })
        : null;

    const retailMarkupPct = Number(
      (p as typeof p & { retail_markup_pct?: number }).retail_markup_pct ?? 0
    );
    // Precio que se muestra: mayorista para quienes tienen acceso, minorista para el resto
    // Si retail_markup_pct = 0 → null (se muestra "Consultar")
    const retailPrice =
      wholesalePrice != null && retailMarkupPct > 0
        ? Math.round(wholesalePrice * (1 + retailMarkupPct / 100) * 100) / 100
        : null;

    const price = isWholesale ? wholesalePrice : retailPrice;

    return {
      ...p,
      price,
      inStock:
        Number(p.stock_current) > 0 &&
        !(p as typeof p & { catalog_out_of_stock?: boolean }).catalog_out_of_stock,
      image_urls:
        (p as typeof p & { image_urls?: string[] }).image_urls ?? [],
    };
  });

  const goldSpot = spots.oro?.price_eur_per_g ?? null;
  const silverSpot = spots.plata?.price_eur_per_g ?? null;
  const brandName =
    (company as { trade_name?: string } | null)?.trade_name ?? "Lingot";

  const year = new Date().getFullYear();

  return (
    <div className="relative min-h-screen" style={{ background: "#f5f1ea" }}>
      <div className="grain-overlay" />

      {/* ── Admin banner ─────────────────────────────────────────────── */}
      {isAdmin && !catalogEnabled && (
        <div className="relative z-50 border-b border-warning/30 bg-warning/10 px-6 py-2.5 text-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-warning">
            Vista previa de administrador · El catálogo no está publicado
          </span>
        </div>
      )}

      {/* ── Acceso profesional ───────────────────────────────────────── */}
      <div className="fixed right-5 top-5 z-50">
        <CatalogLoginButton isLoggedIn={!!user} isWholesale={isWholesale} />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          HERO — full viewport, logo centrado
      ══════════════════════════════════════════════════════════════ */}
      <header className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">

        {/* Background gradient layers */}
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(160deg, #041c28 0%, #0a3746 45%, #062632 100%)" }} />

        {/* Overlay cream — opacidad controlada por scroll (CatalogScrollTransition) */}
        <div
          id="hero-fade-overlay"
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "#f5f1ea", opacity: 0, zIndex: 20 }}
        />

        {/* Central gold ambient glow behind logo */}
        <div aria-hidden className="hero-glow pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: "min(80vw, 700px)", height: "40vh",
            background: "radial-gradient(ellipse, rgba(184,138,61,0.18) 0%, transparent 68%)",
            filter: "blur(48px)",
          }} />

        {/* Top-right accent orb */}
        <div aria-hidden className="catalog-orb pointer-events-none absolute -right-32 -top-32 h-[520px] w-[520px] rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(184,138,61,0.10), transparent 70%)", filter: "blur(80px)" }} />

        {/* Bottom-left accent orb */}
        <div aria-hidden className="catalog-orb pointer-events-none absolute -bottom-40 -left-40 h-[640px] w-[640px] rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(10,55,70,0.35), transparent 70%)", filter: "blur(100px)", animationDelay: "6s" }} />

        {/* Subtle vertical column rules */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-[6vw] w-px hidden lg:block"
          style={{ background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.04) 20%, rgba(255,255,255,0.04) 80%, transparent)" }} />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-[6vw] w-px hidden lg:block"
          style={{ background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.04) 20%, rgba(255,255,255,0.04) 80%, transparent)" }} />

        {/* ── Contenido hero ───────────────────────────────────────── */}
        <div className="relative z-10 flex flex-col items-center text-center" style={{ paddingBottom: "8vh" }}>

          {/* Eyebrow */}
          <p className="reveal delay-0 font-mono text-[10px] uppercase tracking-[0.55em] text-gold">
            Colección · {year}
          </p>

          {/* Logo SVG — el momento wow */}
          <div className="reveal delay-1 logo-breathe mt-10 w-full"
            style={{ maxWidth: "min(72vw, 640px)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-blanco.svg"
              alt={brandName}
              className="h-auto w-full select-none"
              draggable={false}
              style={{ opacity: 0.92 }}
            />
          </div>

          {/* Divisor dorado animado */}
          <div className="reveal delay-2 mt-10 flex w-full max-w-xs items-center gap-4">
            <div className="gold-shimmer h-px flex-1" />
            <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.5em] text-white/50">
              Metales Preciosos
            </span>
            <div className="gold-shimmer h-px flex-1" style={{ animationDirection: "reverse" }} />
          </div>

          {/* Precios spot */}
          {(goldSpot != null || silverSpot != null) && (
            <div className="reveal delay-3 mt-10 flex flex-wrap items-stretch justify-center gap-2.5">
              {goldSpot != null && (
                <div className="flex items-center gap-3.5 px-5 py-3 backdrop-blur-md"
                  style={{
                    background: "rgba(184,138,61,0.08)",
                    border: "1px solid rgba(184,138,61,0.22)",
                  }}>
                  <span className="live-dot h-1.5 w-1.5 rounded-full bg-gold" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-gold/80">Oro</span>
                  <div className="h-3 w-px bg-white/10" />
                  <span className="font-editorial text-[18px] leading-none text-white">
                    {formatCurrency(goldSpot)}
                    <span className="ml-1 font-mono text-[9px] text-white/40">/g</span>
                  </span>
                </div>
              )}
              {silverSpot != null && (
                <div className="flex items-center gap-3.5 px-5 py-3 backdrop-blur-md"
                  style={{
                    background: "rgba(200,216,224,0.05)",
                    border: "1px solid rgba(200,216,224,0.12)",
                  }}>
                  <span className="live-dot h-1.5 w-1.5 rounded-full bg-white/50"
                    style={{ animationDelay: "0.7s" }} />
                  <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/60">Plata</span>
                  <div className="h-3 w-px bg-white/10" />
                  <span className="font-editorial text-[18px] leading-none text-white">
                    {formatCurrency(silverSpot)}
                    <span className="ml-1 font-mono text-[9px] text-white/40">/g</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Contador de referencias */}
          <p className="reveal delay-4 mt-8 font-mono text-[9px] uppercase tracking-[0.45em] text-white/35">
            {products.length}{" "}
            {products.length === 1 ? "referencia disponible" : "referencias disponibles"}
          </p>
        </div>

        {/* Scroll cue */}
        <div className="reveal delay-5 absolute bottom-10 left-0 right-0 flex flex-col items-center gap-3">
          <div className="h-10 w-px"
            style={{ background: "linear-gradient(to bottom, transparent, rgba(184,138,61,0.5))" }} />
          <span className="font-mono text-[8px] uppercase tracking-[0.5em] text-white/25">
            Explorar
          </span>
        </div>
      </header>

      <CatalogScrollTransition />

      {/* ══════════════════════════════════════════════════════════════
          TICKER
      ══════════════════════════════════════════════════════════════ */}
      {(goldSpot != null || silverSpot != null) && (
        <div className="overflow-hidden py-3"
          style={{ background: "#030f17", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="ticker-track inline-flex whitespace-nowrap">
            {Array.from({ length: 16 }, (_, i) => (
              <span key={i}
                className="inline-flex shrink-0 items-center gap-5 px-8 font-mono text-[9px] uppercase tracking-[0.32em]">
                {goldSpot != null && (
                  <>
                    <span className="text-gold/70">Oro</span>
                    <span className="text-white/30">{formatCurrency(goldSpot)} /g</span>
                    <span className="text-white/10">✦</span>
                  </>
                )}
                {silverSpot != null && (
                  <>
                    <span className="text-white/35">Plata</span>
                    <span className="text-white/30">{formatCurrency(silverSpot)} /g</span>
                    <span className="text-white/10">✦</span>
                  </>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          GRID
      ══════════════════════════════════════════════════════════════ */}
      <main className="relative" style={{ background: "#f5f1ea" }}>
        {products.length === 0 ? (
          <div className="py-32 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em]"
              style={{ color: "rgba(10,37,48,0.3)" }}>
              Sin productos disponibles
            </p>
          </div>
        ) : (
          <CatalogGrid products={products} isLoggedIn={!!user} />
        )}
      </main>

      {/* ══════════════════════════════════════════════════════════════
          MIS RESERVAS
      ══════════════════════════════════════════════════════════════ */}
      {user && (
        <section style={{ background: "#f5f1ea" }} className="px-4 py-16 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <MisReservas userId={user.id} />
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════ */}
      <footer className="relative overflow-hidden px-6 py-28 text-center"
        style={{ background: "#ede8df", borderTop: "1px solid rgba(10,37,48,0.06)" }}>
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 50% 60% at 50% 100%, rgba(184,138,61,0.08), transparent)" }} />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="h-px w-20"
            style={{ background: "linear-gradient(to right, transparent, rgba(184,138,61,0.5), transparent)" }} />
          <p className="font-mono text-[9px] uppercase tracking-[0.45em]"
            style={{ color: "rgba(10,37,48,0.3)" }}>
            {brandName} · Joyería · Metales Preciosos · {year}
          </p>
        </div>
      </footer>
    </div>
  );
}
