import { PageHeader } from "@/components/layout/page-header";
import { ClientForm } from "../client-form";

export default function NuevoClientePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Nuevo cliente"
        description="Alta de un cliente particular o empresa."
      />
      <div className="rounded-md border border-border bg-surface p-6">
        <ClientForm mode="create" />
      </div>
    </div>
  );
}
