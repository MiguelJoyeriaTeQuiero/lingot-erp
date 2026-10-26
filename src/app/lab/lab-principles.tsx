"use client";

import { useEffect, useRef, useState } from "react";
import { useLabLang } from "./lab-lang";
import { Count } from "./lab-parts";

/* ═══════════════════════════════════════════════════════════════════════════
   Principios en slider.

   Sustituye a la pila 3D: pulsar una pila de placas para «levantar» la de
   arriba no era evidente para todo el mundo. Un slider se entiende solo —
   la siguiente placa asoma por la derecha, hay flechas, contador y se puede
   arrastrar con el dedo, el ratón o el trackpad.

   El arrastre escribe una custom property en la pista, no estado de React:
   seguir el dedo a 60 fps no puede depender de un re-render por evento.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface LabPrinciple {
  n:       string;
  name:    string;
  tag:     string;
  display: React.ReactNode;
  unit:    string;
  d:       string;
}

type Vars = React.CSSProperties & Record<string, string | number>;

/**
 * Los cuatro principios son los de src/app/catalogo/nosotros/page.tsx. El texto
 * vive en el diccionario; aquí solo se compone. El segundo enseña el spot del
 * oro por gramo cuando lo hay.
 */
export function usePrincipleItems(spotOro: number | null): LabPrinciple[] {
  const { t, money } = useLabLang();
  return ([1, 2, 3, 4] as const).map((k) => ({
    n:    `0${k}`,
    name: t(`p${k}.name`),
    tag:  t(`p${k}.tag`),
    display:
      k === 1 ? <Count value={999.9} format={(n) => n.toFixed(1)} />
      : k === 2 ? (spotOro != null ? money(spotOro) : t("p2.tag"))
      : k === 3 ? "LBMA"
      : t("p4.display"),
    unit: k === 2 && spotOro == null ? t("p2.unitAlt") : t(`p${k}.unit`),
    d:    t(`p${k}.body`),
  }));
}

/** Píxeles de arrastre a partir de los cuales se decide el eje del gesto. */
const AXIS_SLOP = 8;

export function LabPrinciples({ items }: { items: LabPrinciple[] }) {
  const { t } = useLabLang();
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef    = useRef<HTMLDivElement>(null);
  // El arrastre que acaba de terminar no puede contar también como clic
  const movedRef    = useRef(false);
  // El índice vivo para los manejadores nativos, que no se re-suscriben
  const indexRef    = useRef(index);
  useEffect(() => { indexRef.current = index; }, [index]);

  const last = items.length - 1;
  const go = (i: number) => setIndex(Math.max(0, Math.min(last, i)));

  /* ── Arrastre: dedo y ratón ──────────────────────────────────────── */
  useEffect(() => {
    const vp = viewportRef.current;
    const track = trackRef.current;
    if (!vp || !track) return;

    let id: number | null = null;
    let x0 = 0, y0 = 0, dx = 0;
    let axis: "x" | "y" | null = null;

    const setDrag = (px: number) => track.style.setProperty("--drag", `${px}px`);

    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      // Los botones de la propia placa no inician arrastre
      if ((e.target as HTMLElement).closest("button, a")) return;
      id = e.pointerId; x0 = e.clientX; y0 = e.clientY; dx = 0; axis = null;
      movedRef.current = false;
    };

    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const mx = e.clientX - x0;
      const my = e.clientY - y0;
      if (!axis) {
        if (Math.abs(mx) < AXIS_SLOP && Math.abs(my) < AXIS_SLOP) return;
        axis = Math.abs(mx) > Math.abs(my) ? "x" : "y";
        // Gesto vertical: es scroll de página, no nuestro
        if (axis === "y") { id = null; return; }
        vp.setPointerCapture(e.pointerId);
        setDragging(true);
      }
      dx = mx;
      // Resistencia en los extremos: se nota el tope sin bloquear el gesto
      const atEdge = (dx > 0 && indexRef.current === 0) || (dx < 0 && indexRef.current === last);
      setDrag(atEdge ? dx * 0.3 : dx);
      movedRef.current = true;
    };

    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null;
      if (axis === "x") {
        const threshold = Math.min(90, vp.clientWidth * 0.12);
        if (dx < -threshold) setIndex((i) => Math.min(last, i + 1));
        else if (dx > threshold) setIndex((i) => Math.max(0, i - 1));
      }
      setDrag(0);
      setDragging(false);
      axis = null;
    };

    vp.addEventListener("pointerdown", down);
    vp.addEventListener("pointermove", move);
    vp.addEventListener("pointerup", up);
    vp.addEventListener("pointercancel", up);
    return () => {
      vp.removeEventListener("pointerdown", down);
      vp.removeEventListener("pointermove", move);
      vp.removeEventListener("pointerup", up);
      vp.removeEventListener("pointercancel", up);
    };
  }, [last]);

  /* ── Trackpad: deslizamiento horizontal con dos dedos ────────────── */
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    let acc = 0;
    let lockedUntil = 0;
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      // Solo el gesto horizontal: el vertical sigue siendo del motor de scroll
      e.preventDefault();
      const now = performance.now();
      if (now < lockedUntil) return;
      acc += e.deltaX;
      if (Math.abs(acc) > 50) {
        setIndex((i) => Math.max(0, Math.min(last, i + (acc > 0 ? 1 : -1))));
        acc = 0;
        // Un gesto, una placa: la inercia del trackpad no debe saltarse tres
        lockedUntil = now + 650;
      }
    };
    vp.addEventListener("wheel", wheel, { passive: false });
    return () => vp.removeEventListener("wheel", wheel);
  }, [last]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
  };

  return (
    <div
      className="lab-slider"
      role="region"
      aria-roledescription="carousel"
      aria-label={t("principles.region")}
      onKeyDown={onKey}
    >
      <div ref={viewportRef} className="lab-slider-viewport" data-dragging={dragging ? "true" : "false"}>
        <div ref={trackRef} className="lab-slider-track" style={{ "--i": index } as Vars}>
          {items.map((L, i) => (
            <article
              key={L.n}
              className="lab-slide"
              data-on={i === index ? "true" : "false"}
              aria-roledescription="slide"
              aria-label={t("principles.aria", { n: L.n, total: items.length, name: L.name })}
              aria-hidden={i !== index}
              // La placa que asoma también lleva a ella: es lo primero que se toca
              onClick={() => { if (!movedRef.current && i !== index) go(i); }}
            >
              <div className="lab-slide-top">
                <span className="lab-label" style={{ color: "var(--lab-metal)" }}>{L.n} · {L.name}</span>
                <span className="lab-label" style={{ color: "var(--lab-ink-3)" }}>{L.tag}</span>
              </div>

              <div className="lab-slide-main">
                <div>
                  <div className="lab-num lab-slide-figure">{L.display}</div>
                  <div className="lab-label" style={{ color: "var(--lab-ink-3)", marginTop: 14 }}>{L.unit}</div>
                </div>
                <p className="lab-body lab-slide-text">{L.d}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="lab-slider-bar">
        <span className="lab-num lab-slider-count" aria-live="polite" aria-atomic="true">
          {String(index + 1).padStart(2, "0")}
          <i aria-hidden> / </i>
          {String(items.length).padStart(2, "0")}
        </span>

        <div className="lab-slider-steps">
          {items.map((L, i) => (
            <button
              key={L.n}
              type="button"
              className="lab-slider-step"
              data-on={i === index ? "true" : "false"}
              data-past={i < index ? "true" : "false"}
              onClick={() => go(i)}
              aria-label={t("principles.dot", { n: L.n, name: L.name })}
              aria-current={i === index}
            >
              <span className="lab-label">{L.name}</span>
            </button>
          ))}
        </div>

        <div className="lab-slider-arrows">
          <button type="button" className="lab-slider-arrow" onClick={() => go(index - 1)} disabled={index === 0} aria-label={t("principles.prev")}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" className="lab-slider-arrow" onClick={() => go(index + 1)} disabled={index === last} aria-label={t("principles.next")}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>

      <p className="lab-label lab-slider-hint">{t("principles.hint")}</p>
    </div>
  );
}
