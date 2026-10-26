import type { Metadata } from "next";
import { createTypedClient } from "@/lib/supabase/typed";
import { LabAccountPage } from "../lab-access";
import { LabSessionProvider } from "../lab-session";
import { loadLabViewer } from "../lab-viewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mi cuenta · Lingot",
};

export default async function LabMiCuentaPage() {
  // Sin sesión no se redirige: la propia página enseña el acceso
  const { session, orders, documents } = await loadLabViewer(createTypedClient());

  return (
    <LabSessionProvider session={session} orders={orders} documents={documents}>
      <LabAccountPage />
    </LabSessionProvider>
  );
}
