"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLabLang } from "./lab-lang";
import type { LabProduct } from "./lab-experience";
import { useLabSession } from "./lab-session";

const LabIngotViewer = dynamic(() => import("./lab-ingot-viewer").then((m) => m.LabIngotViewer), {
  ssr: false,
});

/* ═══════════════════════════════════════════════════════════════════════════
   Detalle de producto: la pieza en 3D y la reserva, sobre la propia página.

   La reserva llama a la acción real del catálogo (createReservationAction), no
   a una simulación: si no hay sesión responde pidiéndola, igual que en /catalogo.

   Solo hay mapa de relieve para las piezas que lo tienen generado; el resto cae
   a su fotografía. El visor 3D no se descarga si no hace falta.
   ═══════════════════════════════════════════════════════════════════════════ */

interface Piece {
  test:    RegExp;
  /** Mapa de relieve del cuño, si la pieza es una sola. */
  relief?: string;
  /** Rejilla de cubos separables (CombiBar). */
  grid?:   { cols: number; rows: number };
}

const PIECES: Piece[] = [
  { test: /argor.*heraeus.*(classic\s*)?20\s*g/i, relief: "/lab/argor-20g-relief.png" },
  // Valcambi 20 x 1 g: cinco columnas por cuatro filas, según su propia foto
  { test: /combibar/i, grid: { cols: 5, rows: 4 } },
];

export function pieceFor(p: LabProduct): Piece | null {
  const hay = `${p.name} ${p.sku ?? ""}`;
  return PIECES.find((r) => r.test.test(hay)) ?? null;
}

function Chevron() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden>
      <path d="M10 3 L5 8 L10 13" fill="none" stroke="currentColor" strokeWidth="1.4"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface Props {
  product: LabProduct;
  /** Unidades ya elegidas en la ficha: el detalle continúa donde iba. */
  initialQty?: number;
  onClose: () => void;
  /** Sin sesión no se puede reservar: se lo pasamos a la página para abrir el acceso. */
  onNeedsAccess: () => void;
}

export function LabProductDetail({ product: p, initialQty = 1, onClose, onNeedsAccess }: Props) {
  const { session, ready, reserve } = useLabSession();
  const { t, money } = useLabLang();
  const [quantity, setQuantity] = useState(initialQty);
  const [phone, setPhone]       = useState("");
  const [note, setNote]         = useState("");
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [done, setDone]         = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const piece = pieceFor(p);

  // El render manda; la fotografía es la segunda vista. Ambas se montan a la vez:
  // recrear el contexto WebGL en cada cambio costaría más que dejarlo oculto.
  const views: ("3d" | "foto")[] = [
    ...(piece ? (["3d"] as const) : []),
    ...(p.image ? (["foto"] as const) : []),
  ];
  const [view, setView] = useState(0);
  const current = views[view] ?? "foto";
  const go = (d: number) => setView((v) => (v + d + views.length) % views.length);

  /* Escape para cerrar, y el motor de scroll congelado mientras esto está abierto:
     si no, la rueda seguiría moviendo la página por detrás del panel. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.dispatchEvent(new CustomEvent("lab:freeze", { detail: { on: true } }));
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      window.dispatchEvent(new CustomEvent("lab:freeze", { detail: { on: false } }));
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) { onNeedsAccess(); return; }
    setSending(true);
    reserve(p, quantity);
    setSending(false);
    setDone(true);
  }

  const specs: [string, string][] = [
    [t("d.metal"),  t(p.metal === "oro" ? "f.gold" : "f.silver")],
    [t("d.weight"),   p.weight_g >= 1000 ? `${(p.weight_g / 1000).toFixed(2)} kg` : `${p.weight_g} g`],
    [t("d.purity"), t("f.thousandths", { n: (p.purity * 1000).toFixed(1) })],
    ...(p.sku ? ([[t("d.ref"), p.sku]] as [string, string][]) : []),
  ];

  return (
    <div className="lab-detail" role="dialog" aria-modal="true" aria-label={p.name} data-lab-native>
      <div className="lab-detail-veil" onClick={onClose} />

      <div className="lab-detail-panel" ref={panelRef} tabIndex={-1}>
        <button type="button" className="lab-detail-close" onClick={onClose} aria-label={t("d.close")}>
          <span aria-hidden>✕</span>
        </button>

        <div className="lab-detail-grid">
          <div className="lab-detail-stage">
            {piece && (
              <div className="lab-detail-view" data-on={current === "3d" ? "true" : "false"}>
                <LabIngotViewer relief={piece.relief} grid={piece.grid} />
                <span className="lab-label lab-viewer-hint">
                  {piece.grid
                    ? t("d.hintSplit")
                    : t("d.hintTurn")}
                </span>
              </div>
            )}

            {p.image && (
              <div className="lab-detail-view" data-on={current === "foto" ? "true" : "false"}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="lab-detail-photo" src={p.image} alt={p.name} />
              </div>
            )}

            {views.length === 0 && (
              <span className="lab-label" style={{ color: "var(--lab-ink-4)" }}>{t("d.noImage")}</span>
            )}

            {views.length > 1 && (
              <>
                <button type="button" className="lab-arrow lab-arrow--prev"
                  onClick={() => go(-1)} aria-label={t("d.prev")}>
                  <Chevron />
                </button>
                <button type="button" className="lab-arrow lab-arrow--next"
                  onClick={() => go(1)} aria-label={t("d.next")}>
                  <Chevron />
                </button>

                <div className="lab-views">
                  {views.map((v, i) => (
                    <button
                      key={v}
                      type="button"
                      className="lab-view-dot"
                      data-on={i === view ? "true" : "false"}
                      onClick={() => setView(i)}
                      aria-label={t(v === "3d" ? "d.render" : "d.photo")}
                      aria-current={i === view}
                    />
                  ))}
                  <span className="lab-label lab-view-name">
                    {t(current === "3d" ? "d.render" : "d.photo")}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="lab-detail-info">
            <span className="lab-label" style={{ color: "var(--lab-metal)" }}>
              {t(p.metal === "oro" ? "f.gold" : "f.silver")} · {t(p.inStock ? "d.available" : "col.backorder")}
            </span>

            <h2 className="lab-h" style={{ fontSize: "clamp(24px, 3.4vw, 40px)", marginTop: 14 }}>
              {p.name}
            </h2>

            <div className="lab-num" style={{ fontSize: "clamp(28px, 4vw, 44px)", color: "var(--lab-metal-lit)", marginTop: 18 }}>
              {p.price != null ? money(p.price) : t("d.ask")}
            </div>

            <dl className="lab-spec">
              {specs.map(([k, v]) => (
                <div key={k} className="lab-spec-row">
                  <dt className="lab-label" style={{ color: "var(--lab-metal-deep)" }}>{k}</dt>
                  <dd className="lab-body" style={{ fontSize: "clamp(14px, 1.5vw, 16px)", margin: 0 }}>{v}</dd>
                </div>
              ))}
            </dl>

            {done ? (
              <div className="lab-detail-done">
                <span className="lab-detail-tick" aria-hidden>✓</span>
                <p className="lab-h" style={{ fontSize: "clamp(17px, 2vw, 22px)" }}>{t("d.done")}</p>
                <p className="lab-body" style={{ fontSize: 14, marginTop: 10 }}>
                  {t("d.doneBody")}
                </p>
              </div>
            ) : ready && !session ? (
              <div className="lab-detail-gate">
                <p className="lab-body" style={{ fontSize: "clamp(14px, 1.5vw, 16px)" }}>
                  {t("d.gate")}
                </p>
                <button type="button" className="lab-cta" onClick={onNeedsAccess}>
                  {t("d.gateCta")}
                </button>
                <a className="lab-detail-alt" href="tel:+34669393197">
                  {t("d.gateAlt")}
                </a>
              </div>
            ) : (
              <form onSubmit={submit} className="lab-detail-form">
                <div className="lab-field">
                  <label className="lab-label" htmlFor="lab-qty">{t("d.units")}</label>
                  <input
                    id="lab-qty" type="number" min={1} max={99} value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
                    className="lab-input"
                  />
                </div>

                <div className="lab-field">
                  <label className="lab-label" htmlFor="lab-tel">{t("d.phone")}</label>
                  <input
                    id="lab-tel" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder={t("d.phoneHint")} className="lab-input"
                  />
                </div>

                <div className="lab-field lab-field--wide">
                  <label className="lab-label" htmlFor="lab-nota">{t("d.note")}</label>
                  <textarea
                    id="lab-nota" rows={2} value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder={t("d.noteHint")} className="lab-input"
                  />
                </div>

                {error && <p className="lab-detail-error">{error}</p>}

                <button type="submit" className="lab-cta lab-detail-submit" disabled={sending}>
                  {t(sending ? "d.sending" : "col.reserve")}
                </button>

                <p className="lab-body" style={{ fontSize: 12, color: "var(--lab-ink-3)" }}>
                  {p.inStock
                    ? t("d.footIn")
                    : t("d.footOut")}
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
