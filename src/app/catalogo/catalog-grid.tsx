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

// ─── Floating island filter + Bento grid ─────────────────────────────────────
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

  const filtered =
    filter === "all" ? products : products.filter((p) => p.metal === filter);

  const counts = {
    all:   products.length,
    oro:   products.filter((p) => p.metal === "oro").length,
    plata: products.filter((p) => p.metal === "plata").length,
  };

  // IntersectionObserver — blur + translate reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.03, rootMargin: "0px 0px -32px 0px" }
    );
    const els = gridRef.current?.querySelectorAll("[data-reveal]:not(.revealed)");
    els?.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [filtered]);

  const LABELS: Record<Filter, string> = { all: "Todos", oro: "Oro", plata: "Plata" };

  return (
    <div className="pb-32">
      {/* ── Floating Island Filter — light pill ── */}
      <div className="sticky top-5 z-30 flex justify-center px-4 py-4">
        {/* Outer bezel */}
        <div
          style={{
            padding:             "3px",
            borderRadius:        "99px",
            background:          "rgba(249,244,236,0.88)",
            border:              "1px solid rgba(10,31,43,0.10)",
            backdropFilter:      "blur(20px)",
            WebkitBackdropFilter:"blur(20px)",
            boxShadow:           "0 4px 24px -4px rgba(10,31,43,0.08), 0 1px 4px rgba(10,31,43,0.04)",
          }}
        >
          {/* Inner pill */}
          <div
            className="flex"
            style={{
              borderRadius: "99px",
              background:   "rgba(255,255,255,0.55)",
              boxShadow:    "inset 0 1px 0 rgba(255,255,255,0.90)",
              padding:      "3px",
              gap:          "2px",
            }}
          >
            {(["all", "oro", "plata"] as Filter[]).map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="relative font-mono text-[9px] uppercase"
                  style={{
                    borderRadius:  "99px",
                    padding:       "8px 18px",
                    letterSpacing: "0.28em",
                    transition:    `all 0.50s ${SPRING}`,
                    color:         active ? "#F9F4EC" : "rgba(10,31,43,0.40)",
                    background:    active ? "#0a1f2b" : "transparent",
                    boxShadow:     active
                      ? "0 2px 8px -2px rgba(10,31,43,0.22), inset 0 1px 0 rgba(255,255,255,0.08)"
                      : "none",
                  }}
                >
                  {LABELS[f]}
                  <span
                    className="ml-1.5"
                    style={{
                      fontSize:      "8px",
                      letterSpacing: "0.1em",
                      color:         active ? "rgba(249,244,236,0.50)" : "rgba(10,31,43,0.22)",
                      transition:    `color 0.40s ${SPRING}`,
                    }}
                  >
                    {counts[f]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Bento product grid ── */}
      <div
        ref={gridRef}
        className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 lg:px-8"
      >
        {filtered.length === 0 ? (
          <div className="py-40 text-center">
            <p className="font-mono text-[9px] uppercase tracking-[0.42em]"
              style={{ color: "rgba(10,31,43,0.20)" }}>
              Sin referencias en esta categoría
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                index={i}
                isLoggedIn={isLoggedIn}
                isFeatured={i % 7 === 0 && filtered.length > 2}
                onReserve={setRP}
              />
            ))}
          </div>
        )}
      </div>

      {reservingProduct !== null && (
        <ReserveModal
          product={reservingProduct}
          onClose={() => setRP(null)}
        />
      )}
    </div>
  );
}

// ─── Double-Bezel Light Card ──────────────────────────────────────────────────
function ProductCard({
  product: p,
  index,
  isLoggedIn,
  isFeatured,
  onReserve,
}: {
  product:    CatalogProduct;
  index:      number;
  isLoggedIn: boolean;
  isFeatured: boolean;
  onReserve:  (product: CatalogProduct) => void;
}) {
  const cardRef  = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLDivElement>(null);

  const purityLabel =
    p.metal === "oro"
      ? p.purity >= 0.999 ? "24k"
      : p.purity >= 0.916 ? "22k"
      : p.purity >= 0.75  ? "18k"
      : p.purity >= 0.585 ? "14k"
      : `${(p.purity * 1000).toFixed(0)}‰`
      : `${(p.purity * 1000).toFixed(0)}‰`;

  const isGold    = p.metal === "oro";
  // accent RGB for gold / silver products
  const accentR   = isGold ? "154,114,48" : "42,96,112";
  const stagger   = (index % 4) * 70;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left) / width  - 0.5;
    const y = (e.clientY - top)  / height - 0.5;
    el.style.transform = `perspective(1000px) rotateX(${y * -3.5}deg) rotateY(${x * 3.5}deg) translateZ(12px)`;
    if (shineRef.current) {
      shineRef.current.style.opacity = "1";
      shineRef.current.style.background =
        `radial-gradient(circle at ${(x+0.5)*100}% ${(y+0.5)*100}%, rgba(${accentR},0.06) 0%, transparent 65%)`;
    }
  }, [accentR]);

  const handleMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = `transform 0.70s ${SPRING}, box-shadow 0.45s ease`;
    el.style.transform  = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0)";
    if (shineRef.current) shineRef.current.style.opacity = "0";
  }, []);

  const handleMouseEnter = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = "transform 0.10s ease-out, box-shadow 0.28s ease";
  }, []);

  const priceColor = isGold ? "#9a7230" : "#2a6070";

  return (
    <div
      data-reveal
      className={isFeatured ? "col-span-2 sm:col-span-1 xl:col-span-2" : "col-span-1"}
      style={{ transitionDelay: `${stagger}ms` }}
    >
      {/* ── Outer shell (Doppelrand) ── */}
      <div
        className="group h-full cursor-default"
        style={{
          padding:      "3px",
          borderRadius: "28px",
          background:   `rgba(${accentR},0.04)`,
          border:       `1px solid rgba(${accentR},0.09)`,
          transition:   `border-color 0.45s ${SPRING}, box-shadow 0.45s ${SPRING}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = `rgba(${accentR},0.22)`;
          e.currentTarget.style.boxShadow   =
            `0 0 0 1px rgba(${accentR},0.08), 0 16px 40px -16px rgba(10,31,43,0.12), 0 4px 12px -4px rgba(10,31,43,0.06)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = `rgba(${accentR},0.09)`;
          e.currentTarget.style.boxShadow   = "none";
        }}
      >
        {/* ── Inner core — paper white ── */}
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onMouseEnter={handleMouseEnter}
          className="flex h-full flex-col overflow-hidden"
          style={{
            borderRadius:  "25px",
            background:    "#FFFFFF",
            boxShadow:     "inset 0 1px 0 rgba(255,255,255,0.90), 0 1px 2px rgba(10,31,43,0.03)",
            transformStyle:"preserve-3d",
          }}
        >
          {/* Image zone */}
          <div
            className="relative overflow-hidden"
            style={{
              aspectRatio: isFeatured ? "16/9" : "1/1",
              background:  "linear-gradient(145deg, #f8f4ee, #f4ede0)",
            }}
          >
            {/* Shine overlay */}
            <div
              ref={shineRef}
              className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-150"
              style={{ opacity: 0 }}
            />

            {/* Metal badge — nested pill */}
            <div className="absolute left-3 top-3 z-20">
              <div
                style={{
                  padding:      "2px 3px",
                  borderRadius: "99px",
                  background:   `rgba(${accentR},0.06)`,
                  border:       `1px solid rgba(${accentR},0.16)`,
                }}
              >
                <span
                  className="block px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.22em]"
                  style={{
                    borderRadius: "99px",
                    background:   `rgba(${accentR},0.07)`,
                    boxShadow:    "inset 0 1px 0 rgba(255,255,255,0.6)",
                    color:        priceColor,
                  }}
                >
                  {p.metal === "oro" ? "Oro" : "Plata"} · {purityLabel}
                </span>
              </div>
            </div>

            {/* Product image */}
            {p.image_urls?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.image_urls[0]}
                alt={p.name}
                className="h-full w-full object-contain p-6 transition-transform duration-700"
                style={{
                  transform:              "scale(1)",
                  transitionTimingFunction: SPRING,
                  filter:                 isGold
                    ? "drop-shadow(0 6px 20px rgba(154,114,48,0.18))"
                    : "drop-shadow(0 6px 20px rgba(42,96,112,0.14))",
                  mixBlendMode: "multiply",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.07)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                <span
                  className="select-none font-serif italic leading-none"
                  style={{
                    fontSize:      "clamp(52px, 9vw, 88px)",
                    fontWeight:    300,
                    color:         isGold ? "rgba(154,114,48,0.12)" : "rgba(42,96,112,0.10)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {p.name.charAt(0)}
                </span>
                <span
                  className="font-mono text-[7px] uppercase tracking-[0.38em]"
                  style={{ color: isGold ? "rgba(154,114,48,0.35)" : "rgba(42,96,112,0.28)" }}
                >
                  {p.metal === "oro" ? "Oro" : "Plata"} · {purityLabel}
                </span>
              </div>
            )}

            {/* Warm bottom gradient */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-10"
              style={{
                background: isGold
                  ? "linear-gradient(to top, rgba(244,237,224,0.60), transparent)"
                  : "linear-gradient(to top, rgba(234,242,246,0.50), transparent)",
              }}
            />

            {/* Out of stock */}
            {!p.inStock && (
              <div
                className="absolute inset-0 flex items-end p-3"
                style={{
                  background:      "rgba(249,244,236,0.70)",
                  backdropFilter:  "blur(2px)",
                }}
              >
                <div
                  style={{
                    padding:      "2px 3px",
                    borderRadius: "99px",
                    background:   "rgba(177,67,56,0.07)",
                    border:       "1px solid rgba(177,67,56,0.22)",
                  }}
                >
                  <span
                    className="block px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.25em]"
                    style={{ color: "#b14338" }}
                  >
                    Sin stock
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Hairline */}
          <div
            className="h-px shrink-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{
              background: isGold
                ? "linear-gradient(to right, transparent, rgba(154,114,48,0.22), transparent)"
                : "linear-gradient(to right, transparent, rgba(42,96,112,0.14), transparent)",
              opacity: 0.6,
            }}
          />

          {/* Info panel */}
          <div className="flex flex-1 flex-col bg-white px-3 py-3 sm:px-4 sm:py-4">
            <h2
              className="line-clamp-2 font-display text-[12px] font-light leading-snug tracking-tight sm:text-[13px]"
              style={{ color: "#0a1f2b" }}
            >
              {p.name}
            </h2>

            <div className="mt-auto flex flex-col gap-1 pt-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
              <span
                className="font-mono text-[8px] uppercase tracking-[0.18em]"
                style={{ color: "rgba(10,31,43,0.32)" }}
              >
                {Number(p.weight_g).toFixed(2)} g
              </span>
              {p.price != null ? (
                <span
                  className="font-editorial text-[16px] tabular leading-none tracking-[-0.03em] sm:text-[19px]"
                  style={{ color: priceColor }}
                >
                  {formatCurrency(p.price)}
                </span>
              ) : (
                <span
                  className="font-serif italic text-[11px]"
                  style={{ color: "rgba(10,31,43,0.28)" }}
                >
                  Consultar
                </span>
              )}
            </div>

            {/* ── Button-in-Button CTA — dark ink on light ── */}
            {isLoggedIn && p.inStock && (
              <button
                onClick={() => onReserve(p)}
                className="mt-3 flex w-full items-center justify-between rounded-full px-3 py-2 font-mono text-[8px] uppercase tracking-[0.20em] sm:mt-3.5 sm:px-4 sm:py-2.5 sm:text-[9px] sm:tracking-[0.28em]"
                style={{
                  background:  "#0a1f2b",
                  color:       "rgba(249,244,236,0.88)",
                  transition:  `all 0.45s ${SPRING}`,
                  boxShadow:   "0 2px 8px -2px rgba(10,31,43,0.18)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background  = "#162e40";
                  e.currentTarget.style.transform   = "scale(1.01)";
                  e.currentTarget.style.boxShadow   = "0 4px 16px -4px rgba(10,31,43,0.24)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background  = "#0a1f2b";
                  e.currentTarget.style.transform   = "scale(1)";
                  e.currentTarget.style.boxShadow   = "0 2px 8px -2px rgba(10,31,43,0.18)";
                }}
                onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
                onMouseUp={(e)   => { e.currentTarget.style.transform = "scale(1.01)"; }}
              >
                <span>Reservar</span>
                {/* Trailing icon — button-in-button */}
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[11px]"
                  style={{
                    background: "rgba(249,244,236,0.12)",
                    boxShadow:  "inset 0 1px 0 rgba(255,255,255,0.10)",
                    transition: `transform 0.45s ${OVER}`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "translate(1px,-1px) scale(1.14)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "";
                  }}
                >
                  ↗
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
