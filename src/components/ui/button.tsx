"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "relative bg-primary text-ink hover:bg-primary-deep focus-visible:outline-primary disabled:bg-primary/40 shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_8px_20px_-8px_rgba(10,37,48,0.4)]",
  gold:
    "relative bg-gold text-ink hover:bg-gold-deep focus-visible:outline-gold disabled:bg-gold/40 shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_8px_20px_-8px_rgba(184,138,61,0.5)]",
  secondary:
    "border border-border-strong bg-surface-raised text-primary hover:border-primary hover:bg-surface focus-visible:outline-primary shadow-paper",
  ghost:
    "bg-transparent text-text-muted hover:text-primary hover:bg-surface focus-visible:outline-primary",
  danger:
    "bg-danger text-ink hover:bg-danger/90 focus-visible:outline-danger shadow-[0_8px_20px_-8px_rgba(177,67,56,0.5)]",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-[12px] tracking-wide",
  md: "h-10 px-5 text-[13px] tracking-wide",
  lg: "h-12 px-7 text-sm tracking-wider",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "group/btn inline-flex items-center justify-center gap-2 rounded-none font-medium uppercase",
          "transition-all duration-300 ease-out-expo",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "active:translate-y-px",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        <span className="flex items-center gap-2">{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";
