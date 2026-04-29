"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  hint?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  emptyText?: string;
  allowClear?: boolean;
  className?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Buscar…",
  label,
  error,
  disabled,
  emptyText = "Sin resultados",
  allowClear,
  className,
}: ComboboxProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.hint ?? "").toLowerCase().includes(q)
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
    }
  }, [open]);

  function commit(option: ComboboxOption) {
    onChange(option.value);
    setOpen(false);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt) commit(opt);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={cn("space-y-1.5", className)} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium uppercase tracking-wider text-text-muted"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          aria-invalid={!!error}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-md border bg-surface-raised px-3 py-2 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gold/60",
            error
              ? "border-danger focus:border-danger focus:ring-danger/40"
              : "border-border focus:border-gold",
            disabled && "cursor-not-allowed opacity-60"
          )}
        >
          <span
            className={
              selected ? "truncate text-text" : "truncate text-text-muted/70"
            }
          >
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            aria-hidden
            className="h-4 w-4 shrink-0 text-text-muted"
          />
        </button>

        {open && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface shadow-lg shadow-black/40">
            <div className="relative border-b border-border">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onKey}
                className="block w-full bg-transparent py-2 pl-9 pr-3 text-sm text-text placeholder:text-text-muted/60 focus:outline-none"
                placeholder={placeholder}
              />
            </div>
            <ul className="max-h-64 overflow-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-text-muted">
                  {emptyText}
                </li>
              ) : (
                filtered.map((opt, i) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => commit(opt)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm",
                        i === activeIndex
                          ? "bg-surface-raised text-text"
                          : "text-text-muted hover:bg-surface-raised hover:text-text"
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {opt.hint && (
                        <span className="shrink-0 text-xs text-text-muted">
                          {opt.hint}
                        </span>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
            {allowClear && value !== null && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-center border-t border-border px-3 py-2 text-xs uppercase tracking-widest text-text-muted hover:bg-surface-raised hover:text-text"
              >
                Quitar selección
              </button>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
