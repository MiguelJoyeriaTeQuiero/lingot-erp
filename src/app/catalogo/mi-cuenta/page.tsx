import { redirect } from "next/navigation";
import { createTypedClient } from "@/lib/supabase/typed";
import { loadClientArea } from "../client-area";
import { MiCuentaView } from "./mi-cuenta-view";

export const dynamic = "force-dynamic";

export default async function MiCuentaPage() {
  const supabase = createTypedClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/catalogo");
  }

  const [profileRes, { reservations, documents }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, is_wholesale")
      .eq("id", user.id)
      .maybeSingle(),
    loadClientArea(user.id, user.email ?? null),
  ]);

  const profile = profileRes.data;

  return (
    <MiCuentaView
      user={{
        email: user.email ?? "",
        name:
          (profile as { full_name?: string } | null)?.full_name ??
          user.email ??
          "",
      }}
      isWholesale={
        (profile as { is_wholesale?: boolean } | null)?.is_wholesale ?? false
      }
      reservations={reservations}
      documents={documents}
    />
  );
}
