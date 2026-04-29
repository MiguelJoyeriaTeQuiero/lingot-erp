"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createRectificationInvoice } from "../actions";

export function RectifyButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  async function handleRectify() {
    if (
      !window.confirm(
        "Se creará una factura rectificativa en borrador con las mismas líneas que esta factura. La factura original quedará marcada como rectificada y no podrá volver a emitirse. ¿Continuar?"
      )
    )
      return;

    setPending(true);
    const result = await createRectificationInvoice(documentId);
    setPending(false);

    if (!result.success) {
      toast({
        variant: "error",
        title: "No se pudo crear la rectificativa",
        description: result.error,
      });
      return;
    }

    toast({
      variant: "success",
      title: "Factura rectificativa creada",
      description: "Revisa y ajusta las líneas antes de emitirla.",
    });

    if (result.id && result.id !== documentId) {
      router.push(`/documentos/${result.id}`);
    } else {
      router.refresh();
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      loading={pending}
      onClick={handleRectify}
    >
      <FilePen className="h-3.5 w-3.5" strokeWidth={1.5} />
      Rectificar factura
    </Button>
  );
}
