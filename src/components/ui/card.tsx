import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "vault" | "ghost";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative text-text transition-all duration-500 ease-out-expo",
        variant === "default" &&
          "border border-border bg-surface-raised shadow-paper",
        variant === "vault" &&
          "border border-border bg-gradient-to-br from-surface-raised via-surface-raised to-surface shadow-vault",
        variant === "ghost" && "border border-hairline bg-transparent",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col gap-1 border-b border-hairline px-6 py-5",
      className
    )}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-display text-[15px] font-medium tracking-[-0.01em] text-primary",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardEyebrow = forwardRef<
  HTMLSpanElement,
  HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "font-mono text-[10px] uppercase tracking-[0.28em] text-gold-deep",
      className
    )}
    {...props}
  />
));
CardEyebrow.displayName = "CardEyebrow";

export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-6 py-5", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("border-t border-hairline px-6 py-4", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";
