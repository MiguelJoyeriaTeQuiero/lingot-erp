"use client";

import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  help?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, help, error, id, children, ...props }, ref) => {
    const reactId = useId();
    const selectId = id ?? reactId;

    return (
      <div className="group/field space-y-2">
        {label && (
          <label
            htmlFor={selectId}
            className="block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-text-dim transition-colors group-focus-within/field:text-gold"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={!!error}
            className={cn(
              "block w-full appearance-none rounded-none border-b bg-transparent px-0 py-2.5 pr-8 text-[15px] text-text",
              "transition-colors duration-300 ease-out-expo focus:outline-none",
              error ? "border-danger" : "border-border focus:border-gold",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-text-dim transition-colors group-focus-within/field:text-gold"
            strokeWidth={1.5}
          />
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 transition-transform duration-500 ease-out-expo",
              error ? "bg-danger" : "bg-gold",
              "group-focus-within/field:scale-x-100"
            )}
          />
        </div>
        {error ? (
          <p className="text-[11px] tracking-wide text-danger">{error}</p>
        ) : help ? (
          <p className="text-[11px] text-text-dim">{help}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = "Select";
