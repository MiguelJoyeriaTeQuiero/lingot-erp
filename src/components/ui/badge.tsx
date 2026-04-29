import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "borrador"
  | "emitido"
  | "pagado"
  | "vencido"
  | "cancelado"
  | "convertido"
  | "neutral";

const variantClasses: Record<BadgeVariant, string> = {
  borrador: "border-border-strong bg-surface text-text-muted",
  emitido: "border-sky-700/30 bg-sky-50 text-sky-800",
  pagado: "border-success/40 bg-success/10 text-success",
  vencido: "border-danger/40 bg-danger/10 text-danger",
  cancelado: "border-border bg-surface text-text-dim",
  convertido: "border-gold/50 bg-gold/10 text-gold-deep",
  neutral: "border-border bg-surface text-text-muted",
};

const dotClasses: Record<BadgeVariant, string> = {
  borrador: "bg-text-dim",
  emitido: "bg-sky-700 shadow-[0_0_6px_rgba(3,105,161,0.5)]",
  pagado: "bg-success shadow-[0_0_6px_rgba(62,129,96,0.6)]",
  vencido: "bg-danger shadow-[0_0_6px_rgba(177,67,56,0.6)]",
  cancelado: "bg-text-dim",
  convertido: "bg-gold shadow-[0_0_6px_rgba(184,138,61,0.7)]",
  neutral: "bg-text-dim",
};

const labels: Record<BadgeVariant, string> = {
  borrador: "Borrador",
  emitido: "Emitido",
  pagado: "Pagado",
  vencido: "Vencido",
  cancelado: "Cancelado",
  convertido: "Convertido",
  neutral: "—",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export function Badge({
  variant = "neutral",
  dot = true,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.22em]",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          aria-hidden
          className={cn("h-1 w-1 rounded-full", dotClasses[variant])}
        />
      )}
      {children ?? labels[variant]}
    </span>
  );
}
