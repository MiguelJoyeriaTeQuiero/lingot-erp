"use client";

import { useEffect, useRef, useState } from "react";
import { useLabLang } from "./lab-lang";

/* Piezas que comparten la portada y las páginas interiores. */

type Vars = React.CSSProperties & Record<string, string | number>;

/** Año de fundación de Te Quiero: el mismo dato que publica /catalogo. */
export const FUNDADA = 1988;

/** Título enmascarado: cada línea sube desde debajo de su propio recorte. */
export function Rise({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <span className="lab-mask" style={{ "--d": `${delay}ms` } as Vars}>
      <span className={className}>{children}</span>
    </span>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
      <i style={{
        width: 40, height: 1, display: "block",
        background: "linear-gradient(90deg, var(--lab-metal), transparent)",
      }} />
      <span className="lab-label" style={{ color: "var(--lab-metal)" }}>{children}</span>
    </span>
  );
}

/** Contador que se dispara al entrar en pantalla. */
export function Count({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(value); return; }

    let raf = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const run = (now: number) => {
        const t = Math.min(1, (now - start) / 1500);
        setShown(value * (1 - Math.pow(1 - t, 4)));
        if (t < 1) raf = requestAnimationFrame(run);
      };
      raf = requestAnimationFrame(run);
    }, { threshold: 0.4 });

    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value]);

  return <span ref={ref}>{format(shown)}</span>;
}

/**
 * El respaldo del grupo, en cifras. Lo usan la portada y Nosotros. Los años se
 * calculan: escritos a mano caducarían cada enero.
 */
export function useBackingFacts() {
  const { t } = useLabLang();
  return [
    { k: String(FUNDADA), v: t("about.s1") },
    { k: <Count value={17} format={(n) => `+${Math.round(n)}`} />, v: t("about.s2") },
    { k: <Count value={new Date().getFullYear() - FUNDADA} format={(n) => String(Math.round(n))} />, v: t("about.s3") },
  ];
}
