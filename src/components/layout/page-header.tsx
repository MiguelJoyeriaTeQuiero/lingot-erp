import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  action,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("relative pb-8 reveal", className)}>
      {/* Top eyebrow row with hairline */}
      <div className="mb-6 flex items-center gap-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold-deep">
          {eyebrow ?? "Lingot · ERP"}
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-gold/60 via-border-strong to-transparent hairline-anim" />
        <span className="font-mono text-[10px] tabular tracking-[0.24em] text-text-dim">
          {new Date().toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }).toUpperCase()}
        </span>
      </div>

      <div className="flex items-end justify-between gap-8">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[44px] font-medium leading-[0.95] tracking-[-0.02em] text-primary">
            {title}
          </h1>
          {description && (
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-text-muted">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0 pb-1">{action}</div>}
      </div>
    </header>
  );
}
