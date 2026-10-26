"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import { ReserveModal } from "./reserve-modal";

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

const SPRING = "cubic-bezier(0.32, 0.72, 0, 1)";
const OVER   = "cubic-bezier(0.34, 1.56, 0.64, 1)";

export function CatalogGrid({
  products,
  isLoggedIn,
}: {
  products: CatalogProduct[];
  isLoggedIn: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [reservingProduct, setRP] = useState<CatalogProduct | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const filtered = filter === "all" ? products : products.filter((p) => p.metal === filter);

  const counts = {
    all:   products.length,
    oro:   products.filter((p) => p.metal === "oro").length,
    plata: products.filter((p) => p.metal === "plata").length,
  };

  // Reveal cards (re-runs on filter change so newly-shown cards animate in)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.04, rootMargin: "0px 0px -24px 0px" }
    );
    const els = gridRef.current?.querySelectorAll("[data-card]:not(.is-in)");
    els?.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [filtered]);

  const LABELS: Record<Filter, string> = { all: "Todo", oro: "Oro", plata: "Plata" };

  return (
    <div className="pb-28">
      {/* Filter island */}
      <div className="sticky top-[72px] z-30 flex justify-center px-4 py-6">
        <div className="flex rounded-full p-1"
          style={{ background: "rgba(255,255,255,0.7)", border: "1px solid var(--lg-ink-faint)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", boxShadow: "0 6px 28px -8px rgba(10,43,54,0.12)" }}>
          {(["all", "oro", "plata"] as Filter[]).map((f) => {
            const active = filter === f;
            return (
              <button key={f} onClick={() => setFilter(f)} className="lg-label relative"
                style={{
                  borderRadius: "99px", padding: "9px 20px", fontSize: "9px", letterSpacing: "0.26em", textTransform: "uppercase",
                  transition: `all 0.5s ${SPRING}`,
                  color: active ? "var(--lg-light)" : "var(--lg-ink-soft)",
                  background: active ? "var(--lg-vault)" : "transparent",
                  boxShadow: active ? "0 4px 14px -4px rgba(10,43,54,0.35)" : "none",
                }}>
                {LABELS[f]}
                <span className="ml-1.5" style={{ fontSize: "8px", color: active ? "rgba(238,242,244,0.5)" : "var(--lg-ink-dim)" }}>{counts[f]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div ref={gridRef} className="mx-auto max-w-7xl px-4 pb-8 pt-2 sm:px-6 lg:px-8">
        {filtered.length === 0 ? (
          <div className="py-40 text-center">
            <p className="lg-label" style={{ fontSize: "9px", letterSpacing: "0.42em", color: "var(--lg-ink-dim)" }}>Sin referencias en esta categoría</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} isLoggedIn={isLoggedIn}
                isFeatured={i % 7 === 0 && filtered.length > 3} onReserve={setRP} />
            ))}
          </div>
        )}
      </div>

      {reservingProduct !== null && <ReserveModal product={reservingProduct} onClose={() => setRP(null)} />}
    </div>
  );
}

function ProductCard({
  product: p, index, isLoggedIn, isFeatured, onReserve,
}: {
  product: CatalogProduct; index: number; isLoggedIn: boolean; isFeatured: boolean;
  onReserve: (product: CatalogProduct) => void;
}) {
  const cardRef  = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLDivElement>(null);

  const isGold = p.metal === "oro";
  const purityLabel =
    isGold
      ? p.purity >= 0.999 ? "24k"
      : p.purity >= 0.916 ? "22k"
      : p.purity >= 0.75  ? "18k"
      : p.purity >= 0.585 ? "14k"
      : `${(p.purity * 1000).toFixed(0)}‰`
      : `${(p.purity * 1000).toFixed(0)}‰`;

  // Oro → dorado ; Plata → petróleo (hilo de marca)
  const accent = isGold ? "200,161,100" : "15,74,92";
  const priceColor = isGold ? "var(--lg-gold-deep)" : "var(--lg-vault-soft)";
  const stagger = (index % 4) * 60;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left) / width  - 0.5;
    const y = (e.clientY - top)  / height - 0.5;
    el.style.transform = `perspective(1100px) rotateX(${y * -3}deg) rotateY(${x * 3}deg) translateZ(10px)`;
    if (shineRef.current) {
      shineRef.current.style.opacity = "1";
      shineRef.current.style.background = `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(${accent},0.10) 0%, transparent 60%)`;
    }
  }, [accent]);

  const handleMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = `transform 0.7s ${SPRING}`;
    el.style.transform  = "perspective(1100px) rotateX(0deg) rotateY(0deg) translateZ(0)";
    if (shineRef.current) shineRef.current.style.opacity = "0";
  }, []);

  const handleMouseEnter = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = "transform 0.1s ease-out";
  }, []);

  return (
    <div data-card data-lg-reveal
      className={isFeatured ? "col-span-2 sm:col-span-1 xl:col-span-2" : "col-span-1"}
      style={{ transitionDelay: `${stagger}ms` }}>
      <div ref={cardRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} onMouseEnter={handleMouseEnter}
        className="lg-card group flex h-full flex-col overflow-hidden rounded-3xl"
        style={{ background: "var(--lg-surface)", border: "1px solid var(--lg-ink-faint)", transformStyle: "preserve-3d", transition: `border-color 0.4s ${SPRING}, box-shadow 0.4s ${SPRING}, transform 0.7s ${SPRING}` }}>
        {/* Image */}
        <div className="relative overflow-hidden" style={{ aspectRatio: isFeatured ? "16/10" : "1/1", background: "linear-gradient(150deg, #f4f7f8, #e9eef1)" }}>
          <div ref={shineRef} className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-150" style={{ opacity: 0 }} />

          {/* Purity badge */}
          <div className="absolute left-3 top-3 z-20">
            <span className="lg-label block rounded-full px-2.5 py-1"
              style={{ fontSize: "7px", letterSpacing: "0.22em", background: `rgba(${accent},0.10)`, border: `1px solid rgba(${accent},0.22)`, color: priceColor }}>
              {isGold ? "Oro" : "Plata"} · {purityLabel}
            </span>
          </div>

          {p.image_urls?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image_urls[0]} alt={p.name}
              className="h-full w-full object-contain p-7 transition-transform duration-700"
              style={{ transitionTimingFunction: SPRING, filter: `drop-shadow(0 10px 26px rgba(${accent},0.24))`, mixBlendMode: "multiply" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.07)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }} />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3">
              <span className="lg-display select-none" style={{ fontSize: "clamp(52px, 9vw, 92px)", fontWeight: 300, color: `rgba(${accent},0.16)` }}>{p.name.charAt(0)}</span>
              <span className="lg-label" style={{ fontSize: "7px", letterSpacing: "0.38em", color: `rgba(${accent},0.4)` }}>{isGold ? "Oro" : "Plata"} · {purityLabel}</span>
            </div>
          )}

          {!p.inStock && (
            <div className="absolute inset-0 flex items-end p-3" style={{ background: "rgba(236,239,242,0.72)", backdropFilter: "blur(2px)" }}>
              <span className="lg-label rounded-full px-2.5 py-1" style={{ fontSize: "7px", letterSpacing: "0.24em", background: "rgba(193,85,74,0.08)", border: "1px solid rgba(193,85,74,0.24)", color: "#b8493d" }}>Sin stock</span>
            </div>
          )}
        </div>

        {/* Hairline */}
        <div className="h-px shrink-0 opacity-60 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: `linear-gradient(to right, transparent, rgba(${accent},0.28), transparent)` }} />

        {/* Info */}
        <div className="flex flex-1 flex-col px-4 py-4">
          <h2 className="lg-heading line-clamp-2" style={{ fontSize: "13px", fontWeight: 400, color: "var(--lg-ink)", lineHeight: 1.3 }}>{p.name}</h2>

          <div className="mt-auto flex flex-col gap-1 pt-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
            <span className="lg-label" style={{ fontSize: "8px", letterSpacing: "0.16em", color: "var(--lg-ink-dim)" }}>{Number(p.weight_g).toFixed(2)} g</span>
            {p.price != null ? (
              <span className="lg-num" style={{ fontSize: "19px", fontWeight: 500, color: priceColor }}>{formatCurrency(p.price)}</span>
            ) : (
              <span className="lg-label" style={{ fontSize: "9px", letterSpacing: "0.14em", color: "var(--lg-ink-dim)" }}>Consultar</span>
            )}
          </div>

          {isLoggedIn && p.inStock && (
            <button onClick={() => onReserve(p)}
              className="lg-btn lg-label mt-3.5 flex w-full items-center justify-between rounded-full px-4 py-2.5"
              style={{ background: "var(--lg-vault)", color: "var(--lg-light-soft)", fontSize: "9px", letterSpacing: "0.24em", textTransform: "uppercase", boxShadow: "0 4px 14px -6px rgba(10,43,54,0.3)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--lg-vault-soft)"; e.currentTarget.style.color = "var(--lg-light)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--lg-vault)"; e.currentTarget.style.color = "var(--lg-light-soft)"; }}>
              <span>Reservar</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full text-[11px]" style={{ background: "rgba(238,242,244,0.14)", transition: `transform 0.45s ${OVER}` }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translate(1px,-1px) scale(1.14)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ""; }}>↗</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
