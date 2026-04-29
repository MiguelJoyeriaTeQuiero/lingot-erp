"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useRole } from "@/lib/hooks/useRole";

export function RefreshSpotButton() {
  const router = useRouter();
  const { toast } = useToast();
  const { role } = useRole();
  const [pending, setPending] = useState(false);

  if (role !== "admin") return null;

  async function handleRefresh() {
    setPending(true);
    try {
      const res = await fetch("/api/metal-prices/refresh", { method: "POST" });
      const json = (await res.json()) as {
        success: boolean;
        results: Array<{
          metal: string;
          status: string;
          price_eur_per_g?: number;
          error?: string;
        }>;
      };
      if (!res.ok || !json.success) {
        const failed = json.results
          ?.filter((r) => r.status !== "ok")
          .map((r) => `${r.metal}: ${r.error}`)
          .join(" · ");
        toast({
          variant: "error",
          title: "Algunos metales no se han podido refrescar",
          description: failed || "Error desconocido",
        });
      } else {
        const summary = json.results
          .map((r) => `${r.metal} ${r.price_eur_per_g?.toFixed(2)} €/g`)
          .join(" · ");
        toast({ variant: "success", title: "Cotización refrescada", description: summary });
      }
    } catch (e) {
      toast({
        variant: "error",
        title: "Fallo de red",
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setPending(false);
      router.refresh();
    }
  }

  return (
    <Button
      type="button"
      variant="gold"
      size="sm"
      loading={pending}
      onClick={handleRefresh}
    >
      <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
      Refrescar ahora
    </Button>
  );
}
