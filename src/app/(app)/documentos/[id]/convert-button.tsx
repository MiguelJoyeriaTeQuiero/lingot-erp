"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { convertAlbaranToFactura } from "../actions";

export function ConvertButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  async function handleConvert() {
    if (
      !window.confirm(
        "Vas a convertir este albarán en factura. La factura se creará en estado borrador. ¿Continuar?"
      )
    )
      return;

    setPending(true);
    const result = await convertAlbaranToFactura(documentId);
    setPending(false);

    if (!result.success) {
      toast({
        variant: "error",
        title: "No se pudo convertir",
        description: result.error,
      });
      return;
    }

    toast({
      variant: "success",
      title: "Factura creada",
      description: "Revisa los datos antes de emitir.",
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
      variant="gold"
      size="sm"
      loading={pending}
      onClick={handleConvert}
    >
      <ArrowRightLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
      Convertir a factura
    </Button>
  );
}
