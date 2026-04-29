import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { createTypedClient } from "@/lib/supabase/typed";
import { ClientsTable } from "./clients-table";
export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const supabase = createTypedClient();

  const { data: clients, error } = await supabase
    .from("clients")
    .select(
      "id, type, name, tax_id, contact_name, email, phone, address, city, postal_code, country, price_tier, notes, active, created_at, updated_at"
    )
    .order("name", { ascending: true });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Clientes"
        description="Gestión del maestro de clientes: particulares y empresas."
        action={
          <Link href="/clientes/nuevo">
            <Button>
              <Plus className="h-4 w-4" />
              Nuevo cliente
            </Button>
          </Link>
        }
      />

      {error ? (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          No se han podido cargar los clientes: {error.message}
        </div>
      ) : (
        <ClientsTable clients={clients ?? []} />
      )}
    </div>
  );
}
