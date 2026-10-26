import { createTypedClient } from "@/lib/supabase/typed";
import { LabAccountPage } from "../lab-access";
import { LabSessionProvider } from "../lab-session";
import { loadLabViewer } from "../lab-viewer";
import { pageMeta } from "../lab-seo";

export const dynamic = "force-dynamic";

// Zona privada: se rastrea (el pie la enlaza) pero no se indexa
export const metadata = pageMeta({
  title:       "Mi cuenta",
  description: "Área privada de clientes de Lingot: tus reservas y tus documentos.",
  path:        "/mi-cuenta",
  noindex:     true,
});

export default async function MiCuentaPage() {
  // Sin sesión no se redirige: la propia página enseña el acceso
  const { session, orders, documents } = await loadLabViewer(createTypedClient());

  return (
    <LabSessionProvider session={session} orders={orders} documents={documents}>
      <LabAccountPage />
    </LabSessionProvider>
  );
}
