import { getLatestSpots } from "@/lib/metal-prices";
import { computeUnitPrice } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";
import { createTypedClient } from "@/lib/supabase/typed";
import { CatalogGrid } from "./catalog-grid";

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
        "id, name, sku, description, metal, weight_g, purity, markup_per_gram, markup_per_piece, cost_price, image_urls, active, stock_current"
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
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
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
    const price =
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
    return {
      ...p,
      price,
      inStock: Number(p.stock_current) > 0,
      image_urls:
        (p as typeof p & { image_urls?: string[] }).image_urls ?? [],
    };
  });

  const goldSpot = spots.oro?.price_eur_per_g ?? null;
  const silverSpot = spots.plata?.price_eur_per_g ?? null;
  const brandName =
    (company as { trade_name?: string; legal_name?: string } | null)
      ?.trade_name ??
    (company as { trade_name?: string; legal_name?: string } | null)
      ?.legal_name ??
    "Lingot";

  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-primary">
      <div className="grain-overlay" />

      {/* Admin preview banner */}
      {isAdmin && !catalogEnabled && (
        <div className="relative z-50 border-b border-warning/30 bg-warning/10 px-6 py-2.5 text-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-warning">
            Vista previa de administrador · El catálogo no está publicado
          </span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════ */}
      <header className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-6 pb-20">
        {/* Ambient orbs */}
        <div
          aria-hidden
          className="catalog-orb pointer-events-none absolute -right-40 -top-40 h-[660px] w-[660px] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(184,138,61,0.16), transparent 70%)",
            filter: "blur(90px)",
          }}
        />
        <div
          aria-hidden
          className="catalog-orb pointer-events-none absolute -bottom-52 -left-52 h-[800px] w-[800px] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(10,84,106,0.2), transparent 70%)",
            filter: "blur(110px)",
            animationDelay: "5s",
          }}
        />

        {/* Editorial column rules */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-[7vw] w-px hidden lg:block"
          style={{ background: "rgba(255,255,255,0.04)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-[7vw] w-px hidden lg:block"
          style={{ background: "rgba(255,255,255,0.04)" }}
        />

        {/* Hero content */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="reveal delay-0">
            <span className="font-mono text-[10px] uppercase tracking-[0.5em] text-gold">
              Colección · {year}
            </span>
          </div>

          {/* Wordmark */}
          <h1
            className="reveal delay-1 mt-8 select-none font-display font-light leading-none tracking-[-0.04em] text-surface-raised"
            style={{ fontSize: "clamp(68px, 13vw, 168px)" }}
          >
            {brandName.toUpperCase()}
          </h1>

          {/* Gold divider */}
          <div className="reveal delay-2 mt-8 flex items-center gap-5">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold/50" />
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-surface-raised/35">
              Metales Preciosos
            </span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold/50" />
          </div>

          {/* Live spot prices */}
          {(goldSpot != null || silverSpot != null) && (
            <div className="reveal delay-3 mt-10 flex flex-wrap items-center justify-center gap-3">
              {goldSpot != null && (
                <div className="flex items-center gap-3 border border-gold/20 bg-gold/5 px-5 py-3 backdrop-blur-sm">
                  <span className="live-dot h-1.5 w-1.5 rounded-full bg-gold" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
                    Oro
                  </span>
                  <div className="h-3.5 w-px bg-surface-raised/15" />
                  <span className="font-editorial text-xl text-surface-raised">
                    {formatCurrency(goldSpot)}
                    <span className="ml-1 font-mono text-[10px] text-surface-raised/35">
                      /g
                    </span>
                  </span>
                </div>
              )}
              {silverSpot != null && (
                <div className="flex items-center gap-3 border border-surface-raised/10 bg-surface-raised/5 px-5 py-3 backdrop-blur-sm">
                  <span
                    className="live-dot h-1.5 w-1.5 rounded-full bg-surface-raised/50"
                    style={{ animationDelay: "0.6s" }}
                  />
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-surface-raised/45">
                    Plata
                  </span>
                  <div className="h-3.5 w-px bg-surface-raised/15" />
                  <span className="font-editorial text-xl text-surface-raised/65">
                    {formatCurrency(silverSpot)}
                    <span className="ml-1 font-mono text-[10px] text-surface-raised/25">
                      /g
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Product count */}
          <div className="reveal delay-4 mt-8">
            <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-surface-raised/25">
              {products.length}{" "}
              {products.length === 1 ? "referencia disponible" : "referencias disponibles"}
            </span>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="reveal delay-5 absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-surface-raised/20">
            Explorar
          </span>
          <div className="flex h-8 w-5 items-start justify-center rounded-full border border-surface-raised/12 pt-1.5">
            <div
              className="h-1.5 w-0.5 rounded-full bg-surface-raised/25"
              style={{ animation: "bounce 1.8s ease-in-out infinite" }}
            />
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════
          TICKER STRIP
      ══════════════════════════════════════════════════════════════════ */}
      {(goldSpot != null || silverSpot != null) && (
        <div className="overflow-hidden border-y border-white/8 bg-primary-deep py-3">
          <div className="ticker-track inline-flex gap-0 whitespace-nowrap">
            {Array.from({ length: 14 }, (_, i) => (
              <span
                key={i}
                className="inline-flex shrink-0 items-center gap-5 px-6 font-mono text-[10px] uppercase tracking-[0.28em] text-white/25"
              >
                {goldSpot != null && (
                  <>
                    <span className="text-gold">Oro</span>
                    <span className="text-white/40">{formatCurrency(goldSpot)} /g</span>
                    <span className="text-white/15">·</span>
                  </>
                )}
                {silverSpot != null && (
                  <>
                    <span className="text-white/40">Plata</span>
                    <span className="text-white/40">{formatCurrency(silverSpot)} /g</span>
                    <span className="text-white/15">·</span>
                  </>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          CATALOG GRID
      ══════════════════════════════════════════════════════════════════ */}
      <main className="relative">
        {products.length === 0 ? (
          <div className="py-28 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-text-dim">
              Sin productos disponibles
            </p>
          </div>
        ) : (
          <CatalogGrid products={products} />
        )}
      </main>

      {/* ══════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════ */}
      <footer className="relative overflow-hidden bg-primary px-6 py-24 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(184,138,61,0.08), transparent)",
          }}
        />
        <div className="relative z-10 flex flex-col items-center">
          <div className="h-px w-16 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
          <p
            className="mt-10 select-none font-display font-light leading-none tracking-[-0.04em]"
            style={{
              fontSize: "clamp(36px, 7vw, 88px)",
              color: "rgba(251,248,241,0.12)",
            }}
          >
            {brandName.toUpperCase()}
          </p>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.4em] text-surface-raised/15">
            Joyería · Metales Preciosos · {year}
          </p>
        </div>
      </footer>
    </div>
  );
}
