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
      { threshold: 0.06, rootMargin: "0px 0px -48px 0px" }
    );

    const els = gridRef.current?.querySelectorAll("[data-observe]:not(.is-visible)");
    els?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [filtered]);

  return (
    <div>
      {/* ── Filter bar ── */}
      <div className="sticky top-0 z-30 border-b border-border bg-surface-raised/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-0 overflow-x-auto px-6 sm:px-10">
          {(["all", "oro", "plata"] as Filter[]).map((f) => {
            const labels: Record<Filter, string> = { all: "Todos", oro: "Oro", plata: "Plata" };
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={[
                  "relative shrink-0 px-5 py-4 font-mono text-[11px] uppercase tracking-[0.22em] transition-colors duration-200",
                  active ? "text-primary" : "text-text-dim hover:text-text-muted",
                ].join(" ")}
              >
                {labels[f]}
                <span
                  className={[
                    "ml-2 font-mono text-[9px] transition-colors",
                    active ? "text-gold" : "text-text-dim",
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
      <div
        ref={gridRef}
        className="mx-auto max-w-7xl px-6 py-14 sm:px-10 lg:py-20"
      >
        {filtered.length === 0 ? (
          <div className="py-28 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-text-dim">
              Sin referencias en esta categoría
            </p>
          </div>
        ) : (
          <div
            className={
              filtered.length === 1
                ? "mx-auto max-w-xs"
                : filtered.length === 2
                ? "grid grid-cols-2 gap-5 sm:max-w-xl sm:mx-auto"
                : "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            }
          >
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLDivElement>(null);

  const purityLabel =
    p.metal === "oro"
      ? p.purity >= 0.999
        ? "24k"
        : p.purity >= 0.916
        ? "22k"
        : p.purity >= 0.75
        ? "18k"
        : p.purity >= 0.585
        ? "14k"
        : `${(p.purity * 1000).toFixed(0)}‰`
      : `${(p.purity * 1000).toFixed(0)}‰`;

  const metalLabel = p.metal === "oro" ? "Oro" : "Plata";
  const staggerDelay = (index % 3) * 90;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    el.style.transition = "box-shadow 0.25s ease-out";
    el.style.transform = `perspective(900px) rotateX(${y * -5}deg) rotateY(${x * 5}deg) translateZ(4px)`;
    if (shineRef.current) {
      shineRef.current.style.opacity = "1";
      shineRef.current.style.background = `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(255,255,255,0.13) 0%, transparent 65%)`;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition =
      "transform 0.6s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease-out";
    el.style.transform =
      "perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)";
    if (shineRef.current) shineRef.current.style.opacity = "0";
  }, []);

  return (
    // Outer wrapper: opacity reveal (data-observe)
    <div
      ref={wrapRef}
      data-observe
      style={{ transitionDelay: `${staggerDelay}ms` }}
    >
      {/* Inner wrapper: 3D tilt */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="group flex flex-col border border-border bg-surface-raised shadow-paper transition-[box-shadow,border-color] duration-300 hover:border-gold/30 hover:shadow-vault"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* ── Image ── */}
        <div
          className="relative overflow-hidden bg-surface-sunken"
          style={{ aspectRatio: "4/5" }}
        >
          {/* Specular shine overlay */}
          <div
            ref={shineRef}
            className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-150"
            style={{ opacity: 0 }}
          />

          {p.image_urls?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.image_urls[0]}
              alt={p.name}
              className="h-full w-full object-contain p-6 transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
            />
          ) : (
            // Elegant no-image placeholder
            <div
              className="relative flex h-full w-full flex-col items-center justify-center gap-4"
              style={{
                background:
                  p.metal === "oro"
                    ? "linear-gradient(145deg, #f6f2ea 0%, #ede6d6 50%, #f6f2ea 100%)"
                    : "linear-gradient(145deg, #f0f4f5 0%, #e4ecee 50%, #f0f4f5 100%)",
              }}
            >
              {/* Gold rule accent */}
              <div
                className="absolute left-6 right-6 top-6 h-px opacity-40"
                style={{
                  background:
                    p.metal === "oro"
                      ? "linear-gradient(to right, transparent, #b88a3d, transparent)"
                      : "linear-gradient(to right, transparent, #8a9aa0, transparent)",
                }}
              />
              <span
                className="select-none font-display font-light leading-none tracking-[-0.04em]"
                style={{
                  fontSize: "clamp(56px, 10vw, 88px)",
                  color: p.metal === "oro" ? "rgba(184,138,61,0.2)" : "rgba(10,55,70,0.12)",
                }}
              >
                {p.name.charAt(0).toUpperCase()}
              </span>
              <span
                className="font-mono text-[9px] uppercase tracking-[0.35em]"
                style={{ color: p.metal === "oro" ? "#b88a3d" : "#8a9aa0", opacity: 0.7 }}
              >
                {metalLabel} · {purityLabel}
              </span>
              <div
                className="absolute bottom-6 left-6 right-6 h-px opacity-40"
                style={{
                  background:
                    p.metal === "oro"
                      ? "linear-gradient(to right, transparent, #b88a3d, transparent)"
                      : "linear-gradient(to right, transparent, #8a9aa0, transparent)",
                }}
              />
            </div>
          )}

          {/* Out of stock overlay */}
          {!p.inStock && (
            <div className="absolute inset-0 flex items-end bg-surface-raised/10 p-4 backdrop-blur-[1px]">
              <span className="border border-danger/30 bg-danger/10 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.24em] text-danger backdrop-blur-sm">
                Sin stock
              </span>
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div className="flex flex-1 flex-col gap-2 p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-[15px] font-medium leading-snug tracking-tight text-primary">
              {p.name}
            </h2>
            <span className="mt-0.5 shrink-0 border border-gold/30 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-gold-deep">
              {metalLabel} {purityLabel}
            </span>
          </div>

          {p.sku && (
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-dim">
              {p.sku}
            </p>
          )}

          {p.description && (
            <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-text-muted">
              {p.description}
            </p>
          )}

          <div className="mt-auto flex items-end justify-between gap-2 border-t border-hairline pt-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
              {Number(p.weight_g).toFixed(2)} g · {Number(p.purity).toFixed(3)}
            </span>
            {p.price != null ? (
              <span className="font-editorial text-[20px] tabular text-primary transition-colors group-hover:text-gold-deep">
                {formatCurrency(p.price)}
              </span>
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
                Consultar
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
