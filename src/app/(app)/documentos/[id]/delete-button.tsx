"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { deleteDocumentAction } from "../actions";

export function DeleteDocumentButton({
  documentId,
  docCode,
}: {
  documentId: string;
  docCode: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const label = docCode ?? "este documento";
    if (
      !window.confirm(
        `¿Eliminar ${label} de forma permanente?\n\nEsta acción revertirá los movimientos de stock asociados y ajustará el contador de la serie. No se puede deshacer.`
      )
    ) {
      return;
    }

    setLoading(true);
    const result = await deleteDocumentAction(documentId);
    setLoading(false);

    if (!result.success) {
      toast({
        variant: "error",
        title: "No se ha podido eliminar",
        description: result.error,
      });
      return;
    }

    toast({ variant: "success", title: `${label} eliminado` });
    router.push("/documentos");
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={handleDelete}
      loading={loading}
      disabled={loading}
      className="border-danger/40 text-danger hover:border-danger hover:bg-danger/10"
    >
      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
      Eliminar
    </Button>
  );
}
