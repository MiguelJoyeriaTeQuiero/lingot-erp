import { cn } from "@/lib/utils";

interface TopbarProps {
  title?: string;
  className?: string;
}

/**
 * Placeholder Fase 1 — el Sidebar ya cubre la mayoría del chrome.
 * Se completará en Fase 2 con menú de usuario, breadcrumbs y acciones rápidas.
 */
export function Topbar({ title, className }: TopbarProps) {
  return (
    <div
      className={cn(
        "flex h-14 items-center justify-between border-b border-border px-6",
        className
      )}
    >
      <div className="font-display text-sm uppercase tracking-widest text-text-muted">
        {title}
      </div>
    </div>
  );
}
