"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateDocumentMeta } from "../actions";

interface MarkPaidButtonProps {
  documentId: string;
  currentStatus: string;
}

export function MarkPaidButton({ documentId, currentStatus }: MarkPaidButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  const isPaid = currentStatus === "pagado";
  const nextStatus = isPaid ? "emitido" : "pagado";
  const label = isPaid ? "Marcar como pendiente" : "Marcar como pagado";

  async function handleClick() {
    if (
      !window.confirm(
        isPaid
          ? "¿Marcar esta factura como pendiente de pago?"
          : "¿Marcar esta factura como pagada?"
      )
    )
      return;

    setPending(true);
    const result = await updateDocumentMeta(documentId, { status: nextStatus });
    setPending(false);

    if (!result.success) {
      toast({ variant: "error", title: "No se pudo actualizar", description: result.error });
      return;
    }

    toast({
      variant: "success",
      title: isPaid ? "Factura marcada como pendiente" : "Factura marcada como pagada",
    });
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant={isPaid ? "secondary" : "primary"}
      size="sm"
      loading={pending}
      onClick={handleClick}
    >
      {isPaid ? (
        <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
      ) : (
        <CheckCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
      )}
      {label}
    </Button>
  );
}
