import { createTypedClient } from "@/lib/supabase/typed";

export const dynamic = "force-dynamic";

export default async function CatalogoPage() {
  const supabase = createTypedClient();

  const [companyRes, productsRes, { data: { user } }] = await Promise.all([
    supabase
      .from("company_settings")
      .select("trade_name, legal_name, catalog_enabled")
      .eq("id", 1)
      .maybeSingle(),
    supabase
      .from("products")
      .select("id, name, sku, description, metal, weight_g, purity, image_urls, active")
      .eq("active", true)
      .order("name"),
    supabase.auth.getUser(),
  ]);

  const company = companyRes.data;
  const catalogEnabled = company?.catalog_enabled ?? false;

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
  }

  const shopName = company?.trade_name ?? company?.legal_name ?? "Catálogo";

  if (!catalogEnabled && !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-primary px-6 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold">
          Próximamente
        </span>
        <h1 className="mt-4 font-display text-4xl font-medium tracking-tight text-white">
          {shopName}
        </h1>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/50">
          Nuestro catálogo estará disponible muy pronto.
        </p>
      </div>
    );
  }

  const products = productsRes.data ?? [];

  return (
    <div className="min-h-screen bg-ink">
      {/* Admin preview banner */}
      {isAdmin && !catalogEnabled && (
        <div className="bg-warning/10 border-b border-warning/30 px-6 py-3 text-center">
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
          {shopName}
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

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-dim">
          {shopName} · Joyería
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
      <div className="aspect-square overflow-hidden bg-surface-sunken">
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

        <div className="mt-auto pt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">
          {Number(p.weight_g).toFixed(2)} g · ley {Number(p.purity).toFixed(3)}
        </div>
      </div>
    </div>
  );
}
