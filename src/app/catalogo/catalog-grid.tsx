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
      { threshold: 0.05, rootMargin: "0px 0px -32px 0px" }
    );
    const els = gridRef.current?.querySelectorAll("[data-observe]:not(.is-visible)");
    els?.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [filtered]);

  return (
    <div>
      {/* ── Filter bar (dark) ── */}
      <div className="sticky top-0 z-30 border-b border-white/8 bg-primary/96 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center px-4 sm:px-8">
          {(["all", "oro", "plata"] as Filter[]).map((f) => {
            const labels: Record<Filter, string> = { all: "Todos", oro: "Oro", plata: "Plata" };
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={[
                  "relative shrink-0 px-5 py-4 font-mono text-[11px] uppercase tracking-[0.22em] transition-colors duration-200",
                  active
                    ? "text-surface-raised"
                    : "text-surface-raised/30 hover:text-surface-raised/60",
                ].join(" ")}
              >
                {labels[f]}
                <span
                  className={[
                    "ml-2 font-mono text-[9px]",
                    active ? "text-gold" : "text-white/15",
                  ].join(" ")}
                >
                  {counts[f]}
                </span>
                {active && (
                  <span className="absolute inset-x-0 bottom-0 h-px bg-gold" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Grid ── */}
      <div ref={gridRef} className="mx-auto max-w-7xl px-4 py-10 sm:px-8 lg:py-14">
        {filtered.length === 0 ? (
          <div className="py-28 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/25">
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
  const staggerDelay = (index % 4) * 75;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    el.style.transition = "box-shadow 0.2s ease-out";
    el.style.transform = `perspective(800px) rotateX(${y * -4}deg) rotateY(${x * 4}deg) translateZ(6px)`;
    if (shineRef.current) {
      shineRef.current.style.opacity = "1";
      shineRef.current.style.background = `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(255,255,255,0.18) 0%, transparent 60%)`;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = "transform 0.55s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease-out";
    el.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0)";
    if (shineRef.current) shineRef.current.style.opacity = "0";
  }, []);

  return (
    <div
      data-observe
      style={{ transitionDelay: `${staggerDelay}ms` }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="group flex cursor-default flex-col bg-surface-raised shadow-paper transition-shadow duration-300 hover:shadow-glow"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* ── Image ── */}
        <div className="relative aspect-square overflow-hidden bg-ink">
          {/* Specular shine */}
          <div
            ref={shineRef}
            className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-150"
            style={{ opacity: 0 }}
          />

          {/* Metal badge */}
          <div className="absolute right-2.5 top-2.5 z-20">
            <span
              className="inline-block px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.18em]"
              style={{
                background: p.metal === "oro"
                  ? "rgba(184,138,61,0.12)"
                  : "rgba(10,55,70,0.08)",
                border: p.metal === "oro"
                  ? "1px solid rgba(184,138,61,0.35)"
                  : "1px solid rgba(10,55,70,0.18)",
                color: p.metal === "oro" ? "#8b6628" : "#5b6e76",
              }}
            >
              {metalLabel} {purityLabel}
            </span>
          </div>

          {p.image_urls?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.image_urls[0]}
              alt={p.name}
              className="h-full w-full object-contain p-7 transition-transform duration-600 ease-out-expo group-hover:scale-[1.05]"
            />
          ) : (
            <div
              className="flex h-full w-full flex-col items-center justify-center gap-3"
              style={{
                background: p.metal === "oro"
                  ? "linear-gradient(150deg,#f6f2ea,#ede6d6)"
                  : "linear-gradient(150deg,#eef2f4,#e2eaed)",
              }}
            >
              <span
                className="select-none font-display font-light leading-none"
                style={{
                  fontSize: "clamp(48px,8vw,72px)",
                  color: p.metal === "oro" ? "rgba(184,138,61,0.22)" : "rgba(10,55,70,0.12)",
                }}
              >
                {p.name.charAt(0).toUpperCase()}
              </span>
              <span
                className="font-mono text-[8px] uppercase tracking-[0.3em]"
                style={{ color: p.metal === "oro" ? "#b88a3d" : "#8a9aa0", opacity: 0.6 }}
              >
                {metalLabel} · {purityLabel}
              </span>
            </div>
          )}

          {!p.inStock && (
            <div className="absolute inset-0 flex items-end bg-white/20 p-3 backdrop-blur-[1px]">
              <span className="border border-danger/30 bg-danger/10 px-2.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.22em] text-danger">
                Sin stock
              </span>
            </div>
          )}
        </div>

        {/* Gold separator */}
        <div
          className="h-px shrink-0"
          style={{
            background: "linear-gradient(to right, transparent, rgba(184,138,61,0.25), transparent)",
          }}
        />

        {/* ── Info ── */}
        <div className="flex flex-col gap-2.5 px-4 py-4">
          <h2 className="font-display text-[13.5px] font-medium leading-snug tracking-tight text-primary">
            {p.name}
          </h2>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-text-dim">
              {Number(p.weight_g).toFixed(2)} g
            </span>
            {p.price != null ? (
              <span className="font-editorial text-[19px] tabular text-primary transition-colors duration-300 group-hover:text-gold-deep">
                {formatCurrency(p.price)}
              </span>
            ) : (
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-text-dim">
                Consultar
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
