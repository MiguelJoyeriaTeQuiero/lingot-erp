import { getLatestSpots } from "@/lib/metal-prices";
import { computeUnitPrice } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";
import { createTypedClient } from "@/lib/supabase/typed";

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
      .select("id, name, sku, description, metal, weight_g, purity, markup_per_gram, markup_per_piece, image_urls, active, stock_current")
      .eq("active", true)
      .order("name"),
    getLatestSpots(),
    supabase.auth.getUser(),
  ]);

  const company = companyRes.data;
  const catalogEnabled = company?.catalog_enabled ?? false;
  const globalMarkupPct = Number((company as { metal_markup_pct?: number } | null)?.metal_markup_pct ?? 4);

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
  }

  if (!catalogEnabled && !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-primary px-6 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold">
          Próximamente
        </span>
        <h1 className="mt-4 font-display text-4xl font-medium tracking-tight text-white">
          Lingot
        </h1>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/50">
          Nuestro catálogo estará disponible muy pronto.
        </p>
      </div>
    );
  }

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
            spot_eur_per_g: spot,
            global_markup_pct: globalMarkupPct,
          })
        : null;
    return { ...p, price, inStock: Number(p.stock_current) > 0 };
  });

  return (
    <div className="min-h-screen bg-ink">
      {isAdmin && !catalogEnabled && (
        <div className="border-b border-warning/30 bg-warning/10 px-6 py-3 text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-warning">
            Vista previa de administrador · El catálogo no está publicado
          </span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-surface-raised px-6 py-12 text-center shadow-paper">
        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold-deep">
          Colección
        </span>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-primary md:text-5xl">
          Lingot
        </h1>
        <div className="mx-auto mt-4 h-px w-16 bg-gold/60" />
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.3em] text-text-dim">
          {products.length} {products.length === 1 ? "referencia" : "referencias"}
        </p>
      </header>

      {/* Products grid */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        {products.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-mono text-[12px] uppercase tracking-[0.3em] text-text-dim">
              Sin productos disponibles
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border px-6 py-8 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-dim">
          Lingot · Joyería
        </p>
      </footer>
    </div>
  );
}

type CatalogProduct = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  metal: string;
  weight_g: number;
  purity: number;
  image_urls: string[];
  price: number | null;
  inStock: boolean;
};

function ProductCard({ product: p }: { product: CatalogProduct }) {
  const purityLabel =
    p.metal === "oro"
      ? p.purity >= 0.999
        ? "24k"
        : p.purity >= 0.75
        ? "18k"
        : p.purity >= 0.585
        ? "14k"
        : `${(p.purity * 1000).toFixed(0)}‰`
      : `${(p.purity * 1000).toFixed(0)}‰`;

  return (
    <div className="group flex flex-col border border-border bg-surface-raised shadow-paper transition-shadow hover:shadow-vault">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-surface-sunken">
        {p.image_urls?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.image_urls[0]}
            alt={p.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-text-dim">
              Sin imagen
            </span>
          </div>
        )}
        {!p.inStock && (
          <div className="absolute inset-0 flex items-end p-3">
            <span className="border border-danger/40 bg-danger/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.24em] text-danger backdrop-blur-sm">
              Sin stock
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-display text-[15px] font-medium leading-snug tracking-tight text-primary">
            {p.name}
          </h2>
          <span className="shrink-0 border border-gold/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-gold-deep">
            {p.metal === "oro" ? "Oro" : "Plata"} {purityLabel}
          </span>
        </div>

        {p.sku && (
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-dim">
            {p.sku}
          </p>
        )}

        {p.description && (
          <p className="mt-1 text-[12.5px] leading-relaxed text-text-muted">
            {p.description}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 border-t border-hairline pt-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">
            {Number(p.weight_g).toFixed(2)} g · {Number(p.purity).toFixed(3)}
          </span>
          {p.price != null ? (
            <span className="font-display text-[18px] font-medium tabular text-primary">
              {formatCurrency(p.price)}
            </span>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">
              Consultar
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
