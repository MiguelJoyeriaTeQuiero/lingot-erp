import { createRawAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/layout/page-header";
import { AccesosClient } from "./accesos-client";

export const dynamic = "force-dynamic";

export default async function AccesosPage() {
  const admin = createRawAdminClient();

  const { data: authUsers } = await admin.auth.admin.listUsers();
  const ids = (authUsers?.users ?? []).map((u) => u.id);

  const { data: profiles } = ids.length > 0
    ? await admin
        .from("profiles")
        .select("id, full_name, email, role, is_wholesale")
        .in("id", ids)
    : { data: [] as never[] };

  const customers = ((profiles as Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
    is_wholesale: boolean | null;
  }>) ?? [])
    .filter((p) => p.role === "customer")
    .map((p) => {
      const authUser = (authUsers?.users ?? []).find((u) => u.id === p.id);
      return {
        id: p.id,
        full_name: p.full_name ?? "",
        email: p.email ?? authUser?.email ?? "",
        is_wholesale: p.is_wholesale ?? false,
        last_sign_in: authUser?.last_sign_in_at ?? null,
      };
    });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Acceso al catálogo"
        description="Gestiona los usuarios con acceso al catálogo. Los marcados como mayoristas ven el precio real."
      />
      <AccesosClient customers={customers} />
    </div>
  );
}
