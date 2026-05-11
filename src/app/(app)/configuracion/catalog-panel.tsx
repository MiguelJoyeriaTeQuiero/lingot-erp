"use client";

import { useState } from "react";
import { ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { toggleCatalogAction } from "./actions";

interface CatalogPanelProps {
  enabled: boolean;
  catalogUrl: string;
}

export function CatalogPanel({ enabled, catalogUrl }: CatalogPanelProps) {
  const { toast } = useToast();
  const [live, setLive] = useState(enabled);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleToggle() {
    setPending(true);
    const next = !live;
    const result = await toggleCatalogAction(next);
    setPending(false);
    if (!result.success) {
      toast({ variant: "error", title: "No se pudo actualizar", description: result.error });
      return;
    }
    setLive(next);
    toast({
      variant: "success",
      title: next ? "Catálogo publicado" : "Catálogo ocultado",
    });
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(catalogUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Status + toggle */}
      <div className="flex items-center justify-between gap-4 border border-border bg-surface-raised p-6 shadow-paper">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={
                "inline-block h-2 w-2 rounded-full " +
                (live ? "bg-success" : "bg-text-dim")
              }
            />
            <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-text-muted">
              {live ? "En vivo" : "Oculto"}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-text-muted">
            {live
              ? "Cualquier persona con el enlace puede ver el catálogo."
              : "Solo los administradores pueden ver el catálogo."}
          </p>
        </div>
        <Button
          type="button"
          variant={live ? "secondary" : "primary"}
          loading={pending}
          onClick={handleToggle}
        >
          {live ? "Ocultar catálogo" : "Publicar catálogo"}
        </Button>
      </div>

      {/* URL */}
      <div className="flex items-center gap-2">
        <div className="flex-1 overflow-hidden border border-border bg-surface px-4 py-2.5">
          <span className="font-mono text-[12px] text-text-muted truncate block">
            {catalogUrl}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          title="Copiar enlace"
          className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-surface text-text-muted transition-colors hover:border-border-strong hover:text-primary"
        >
          {copied ? (
            <Check className="h-4 w-4 text-success" strokeWidth={2} />
          ) : (
            <Copy className="h-4 w-4" strokeWidth={1.5} />
          )}
        </button>
        <a
          href={catalogUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir catálogo"
          className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-surface text-text-muted transition-colors hover:border-border-strong hover:text-primary"
        >
          <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
        </a>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-dim">
        Los precios nunca son visibles en el catálogo público.
      </p>
    </div>
  );
}
