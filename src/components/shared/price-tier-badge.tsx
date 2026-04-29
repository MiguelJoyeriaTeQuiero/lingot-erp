import { cn } from "@/lib/utils";
import type { PriceTier } from "@/lib/validations/client";

const tierClasses: Record<PriceTier, string> = {
  A: "border-border bg-surface-raised text-text-muted",
  B: "border-border bg-surface-raised text-text",
  C: "border-border bg-surface-raised text-text",
  especial: "border-gold/40 bg-gold/10 text-gold",
};

const tierLabels: Record<PriceTier, string> = {
  A: "Tarifa A",
  B: "Tarifa B",
  C: "Tarifa C",
  especial: "Tarifa Especial",
};

export function PriceTierBadge({ tier }: { tier: PriceTier }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-widest",
        tierClasses[tier]
      )}
    >
      {tierLabels[tier]}
    </span>
  );
}
