import Link from "next/link";
import { History } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
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
        action={
          <Link href="/inventario/conteo/historico">
            <Button variant="secondary">
              <History className="h-4 w-4" strokeWidth={1.5} />
              Histórico de conteos
            </Button>
          </Link>
        }
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
