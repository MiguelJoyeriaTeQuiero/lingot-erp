import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg" | "xl";

interface LingotWordmarkProps {
  size?: Size;
  className?: string;
}

const sizeMap: Record<Size, { main: string; sub: string; gap: string }> = {
  sm: { main: "text-lg", sub: "text-[8px]", gap: "mt-0.5" },
  md: { main: "text-2xl", sub: "text-[9px]", gap: "mt-1" },
  lg: { main: "text-4xl", sub: "text-[11px]", gap: "mt-1.5" },
  xl: { main: "text-6xl", sub: "text-xs", gap: "mt-2" },
};

export function LingotWordmark({ size = "md", className }: LingotWordmarkProps) {
  const cls = sizeMap[size];
  return (
    <div
      className={cn(
        "inline-flex flex-col items-start leading-none",
        className
      )}
    >
      <span className="flex items-baseline gap-2">
        <span
          aria-hidden
          className="block h-1.5 w-1.5 translate-y-[-2px] bg-gold"
        />
        <span
          className={cn(
            "font-display font-medium tracking-[0.22em] text-primary",
            cls.main
          )}
        >
          LINGOT
        </span>
      </span>
      <span
        className={cn(
          "self-end uppercase tracking-[0.34em] text-gold-deep",
          cls.gap,
          cls.sub
        )}
      >
        Te Quiero Group
      </span>
    </div>
  );
}
