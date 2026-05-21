"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";

export type CatalogProduct = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  metal: string;
  weight_g: number;
  purity: number;
  image_urls: string[];
  price: number | null;
  inStock: boolean;
};

type Filter = "all" | "oro" | "plata";

// ─── Barra de filtros ──────────────────────────────────────────────────────
export function CatalogGrid({ products }: { products: CatalogProduct[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const gridRef = useRef<HTMLDivElement>(null);

  const filtered =
    filter === "all" ? products : products.filter((p) => p.metal === filter);

  const counts = {
    all: products.length,
    oro: products.filter((p) => p.metal === "oro").length,
    plata: products.filter((p) => p.metal === "plata").length,
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.04, rootMargin: "0px 0px -24px 0px" }
    );
    const els = gridRef.current?.querySelectorAll("[data-observe]:not(.is-visible)");
    els?.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [filtered]);

  return (
    <div>
      {/* ── Filter bar ── */}
      <div
        className="sticky top-0 z-30 backdrop-blur-xl"
        style={{
          background: "rgba(245,241,234,0.95)",
          borderBottom: "1px solid rgba(10,37,48,0.08)",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 sm:px-8">
          {(["all", "oro", "plata"] as Filter[]).map((f) => {
            const labels: Record<Filter, string> = { all: "Todos", oro: "Oro", plata: "Plata" };
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="relative shrink-0 px-5 py-4 font-mono text-[12px] uppercase tracking-[0.22em] transition-colors duration-300 sm:text-[10px] sm:tracking-[0.28em]"
                style={{ color: active ? "#0a2530" : "rgba(10,37,48,0.35)" }}
              >
                {labels[f]}
                <span
                  className="ml-2 font-mono text-[8px]"
                  style={{ color: active ? "#b88a3d" : "rgba(10,37,48,0.2)" }}
                >
                  {counts[f]}
                </span>
                {active && (
                  <span
                    className="absolute inset-x-0 bottom-0 h-px"
                    style={{ background: "linear-gradient(to right, transparent, #b88a3d, transparent)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Grid ── */}
      <div
        ref={gridRef}
        className="mx-auto max-w-7xl px-3 py-8 sm:px-6 sm:py-12 lg:py-16"
      >
        {filtered.length === 0 ? (
          <div className="py-32 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em]"
              style={{ color: "rgba(10,37,48,0.25)" }}>
              Sin referencias en esta categoría
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tarjeta de producto ───────────────────────────────────────────────────
function ProductCard({ product: p, index }: { product: CatalogProduct; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLDivElement>(null);

  const purityLabel =
    p.metal === "oro"
      ? p.purity >= 0.999 ? "24k"
      : p.purity >= 0.916 ? "22k"
      : p.purity >= 0.75  ? "18k"
      : p.purity >= 0.585 ? "14k"
      : `${(p.purity * 1000).toFixed(0)}‰`
      : `${(p.purity * 1000).toFixed(0)}‰`;

  const metalLabel = p.metal === "oro" ? "Oro" : "Plata";
  const isGold = p.metal === "oro";
  const staggerDelay = (index % 4) * 80;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${y * -4.5}deg) rotateY(${x * 4.5}deg) translateZ(10px)`;
    if (shineRef.current) {
      shineRef.current.style.opacity = "1";
      shineRef.current.style.background =
        `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(184,138,61,0.09) 0%, transparent 65%)`;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = "transform 0.65s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease";
    el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)";
    if (shineRef.current) shineRef.current.style.opacity = "0";
  }, []);

  const handleMouseEnter = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = "transform 0.15s ease-out, box-shadow 0.3s ease";
  }, []);

  return (
    <div
      data-observe
      className="h-full"
      style={{ transitionDelay: `${staggerDelay}ms` }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
        className="catalog-card group flex h-full cursor-default flex-col overflow-hidden"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(10,37,48,0.07)",
          transformStyle: "preserve-3d",
        }}
      >
        {/* ── Zona imagen ── */}
        <div
          className="relative aspect-square overflow-hidden"
          style={{ background: "linear-gradient(145deg, #f7f4ef, #ede8df)" }}
        >
          {/* Brillo especular en hover */}
          <div
            ref={shineRef}
            className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-200"
            style={{ opacity: 0 }}
          />

          {/* Badge metal/pureza */}
          <div className="absolute left-3 top-3 z-20">
            <span
              className="inline-block px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] backdrop-blur-sm sm:text-[7px] sm:tracking-[0.22em]"
              style={{
                background: isGold ? "rgba(184,138,61,0.10)" : "rgba(10,55,70,0.06)",
                border: isGold
                  ? "1px solid rgba(184,138,61,0.30)"
                  : "1px solid rgba(10,55,70,0.15)",
                color: isGold ? "#8b6628" : "#2a5565",
              }}
            >
              {metalLabel} · {purityLabel}
            </span>
          </div>

          {/* Imagen o placeholder */}
          {p.image_urls?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.image_urls[0]}
              alt={p.name}
              className="h-full w-full object-contain p-6 transition-transform duration-700 ease-out-expo group-hover:scale-[1.07]"
              style={{ mixBlendMode: "multiply", filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.12))" }}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3">
              <span
                className="select-none font-display leading-none"
                style={{
                  fontSize: "clamp(52px,9vw,80px)",
                  fontWeight: 200,
                  color: isGold ? "rgba(184,138,61,0.18)" : "rgba(10,55,70,0.12)",
                  letterSpacing: "-0.04em",
                }}
              >
                {p.name.charAt(0).toUpperCase()}
              </span>
              <span
                className="font-mono text-[7px] uppercase tracking-[0.35em]"
                style={{ color: isGold ? "rgba(184,138,61,0.40)" : "rgba(10,55,70,0.30)" }}
              >
                {metalLabel} · {purityLabel}
              </span>
            </div>
          )}

          {/* Sin stock overlay */}
          {!p.inStock && (
            <div
              className="absolute inset-0 flex items-end p-3 backdrop-blur-[1px]"
              style={{ background: "rgba(245,241,234,0.60)" }}
            >
              <span
                className="font-mono text-[7px] uppercase tracking-[0.28em]"
                style={{
                  color: "#b14338",
                  border: "1px solid rgba(177,67,56,0.25)",
                  background: "rgba(177,67,56,0.06)",
                  padding: "3px 8px",
                }}
              >
                Sin stock
              </span>
            </div>
          )}
        </div>

        {/* Línea separadora */}
        <div
          className="h-px shrink-0 transition-all duration-500 group-hover:opacity-100"
          style={{
            background: isGold
              ? "linear-gradient(to right, transparent, rgba(184,138,61,0.35), transparent)"
              : "linear-gradient(to right, transparent, rgba(10,55,70,0.12), transparent)",
            opacity: 0.6,
          }}
        />

        {/* ── Info panel ── */}
        <div className="flex flex-1 flex-col px-4 py-3.5">
          <h2
            className="line-clamp-2 font-display text-[15px] font-medium leading-snug tracking-tight sm:text-[13px]"
            style={{ color: "#0a2530" }}
          >
            {p.name}
          </h2>
          <div className="mt-auto flex items-baseline justify-between gap-2 pt-2">
            <span
              className="font-mono text-[11px] uppercase tracking-[0.15em] sm:text-[8.5px] sm:tracking-[0.2em]"
              style={{ color: "rgba(10,37,48,0.35)" }}
            >
              {Number(p.weight_g).toFixed(2)} g
            </span>
            {p.price != null ? (
              <span
                className="font-editorial text-[22px] tabular leading-none sm:text-[20px]"
                style={{ color: isGold ? "#9a7230" : "#1e5468" }}
              >
                {formatCurrency(p.price)}
              </span>
            ) : (
              <span
                className="font-mono text-[10px] uppercase tracking-[0.2em] sm:text-[8px] sm:tracking-[0.25em]"
                style={{ color: "rgba(10,37,48,0.25)" }}
              >
                Consultar
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
