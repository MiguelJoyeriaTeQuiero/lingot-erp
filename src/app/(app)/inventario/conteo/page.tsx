import { PageHeader } from "@/components/layout/page-header";
import { createTypedClient } from "@/lib/supabase/typed";
import { ConteoView } from "./conteo-view";

export const dynamic = "force-dynamic";

export default async function ConteoInventarioPage() {
  const supabase = createTypedClient();

  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operación · 03 · Conteo"
        title="Conteo de inventario"
        description="Escanea o busca cada pieza física, ajusta la cantidad contada y aplica los movimientos de regularización en bloque."
      />

      {error ? (
        <div className="border-l-2 border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
          No se han podido cargar los productos: {error.message}
        </div>
      ) : (
        <ConteoView products={products ?? []} />
      )}
    </div>
  );
}
