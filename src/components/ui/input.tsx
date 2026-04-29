"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  help?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, help, error, id, ...props }, ref) => {
    const reactId = useId();
    const inputId = id ?? reactId;
    const describedBy = error
      ? `${inputId}-error`
      : help
      ? `${inputId}-help`
      : undefined;

    return (
      <div className="group/field space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-text-dim transition-colors group-focus-within/field:text-gold"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(
              "block w-full rounded-none border-b bg-transparent px-0 py-2.5 text-[15px] text-text placeholder:text-text-dim/70",
              "transition-colors duration-300 ease-out-expo",
              "focus:outline-none",
              error
                ? "border-danger"
                : "border-border focus:border-gold",
              className
            )}
            {...props}
          />
          {/* Animated focus underline */}
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
          <p id={`${inputId}-error`} className="text-[11px] tracking-wide text-danger">
            {error}
          </p>
        ) : help ? (
          <p id={`${inputId}-help`} className="text-[11px] text-text-dim">
            {help}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
