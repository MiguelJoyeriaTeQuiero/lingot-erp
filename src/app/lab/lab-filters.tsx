"use client";

import { useState } from "react";
import { Segment } from "./lab-segment";
import { useLabLang } from "./lab-lang";
import type { LabProduct } from "./lab-experience";

/* ═══════════════════════════════════════════════════════════════════════════
   Filtro de la colección.

   Metal, formato y pureza son controles segmentados con una píldora de oro que
   se desliza entre opciones: la posición se mide del botón activo y se publica
   como custom properties, así el movimiento lo hace el compositor y no React.

   El peso usa escala logarítmica. En lineal, con piezas de 2 g a 1 kg, los tres
   cuartos del recorrido servirían para separar 500 de 1000 y todo el catálogo
   pequeño se apelotonaría en el primer centímetro.
   ═══════════════════════════════════════════════════════════════════════════ */

export type Metal  = "todo" | "oro" | "plata";
export type Kind   = "todo" | "lingote" | "moneda";
export type Purity = "todo" | number;

export interface FilterState {
  metal:  Metal;
  kind:   Kind;
  purity: Purity;
  min:    number;
  max:    number;
}

/** El formato no es una columna en la base: viene del nombre de la pieza. */
export function kindOf(p: LabProduct): Exclude<Kind, "todo"> {
  return /^\s*moneda\b/i.test(p.name) ? "moneda" : "lingote";
}

export function weightRange(products: LabProduct[]) {
  const w = products.map((p) => p.weight_g).filter((n) => n > 0);
  return { min: Math.min(...w, 1), max: Math.max(...w, 1000) };
}

export function purities(products: LabProduct[]) {
  return [...new Set(products.map((p) => p.purity))].sort((a, b) => b - a);
}

export function applyFilters(products: LabProduct[], f: FilterState) {
  return products.filter((p) => {
    if (f.metal !== "todo" && p.metal !== f.metal) return false;
    if (f.kind !== "todo" && kindOf(p) !== f.kind) return false;
    if (f.purity !== "todo" && Math.abs(p.purity - f.purity) > 1e-6) return false;
    // Media décima de tolerancia: los pesos llevan decimales (31,1 · 7,78)
    if (p.weight_g < f.min - 0.05 || p.weight_g > f.max + 0.05) return false;
    return true;
  });
}

export function isPristine(f: FilterState, bounds: { min: number; max: number }) {
  return f.metal === "todo" && f.kind === "todo" && f.purity === "todo"
    && f.min <= bounds.min + 0.05 && f.max >= bounds.max - 0.05;
}

export const fmtWeight = (w: number) =>
  w >= 1000
    ? `${(w / 1000).toFixed(w % 1000 > 1 ? 2 : 0)} kg`
    : `${w < 10 ? Number(w.toFixed(2)) : Math.round(w)} g`;

const fmtPurity = (p: number) => (p * 1000).toFixed(0);

/* ── Filtro ─────────────────────────────────────────────────────────────── */

interface Props {
  state:    FilterState;
  onChange: (next: FilterState) => void;
  bounds:   { min: number; max: number };
  purityOptions: number[];
  matches:  number;
  total:    number;
}

/** Lo aplicado, en una línea: sirve para saber qué filtra sin tener que abrir. */
function summarise(
  f: FilterState,
  bounds: { min: number; max: number },
  t: (k: string, v?: Record<string, string | number>) => string
) {
  const parts: string[] = [];
  if (f.metal !== "todo")  parts.push(t(f.metal === "oro" ? "f.gold" : "f.silver"));
  if (f.kind !== "todo")   parts.push(t(f.kind === "moneda" ? "f.coin" : "f.bar"));
  if (f.purity !== "todo") parts.push(t("f.thousandths", { n: (Number(f.purity) * 1000).toFixed(0) }));
  const wide = f.min <= bounds.min + 0.05 && f.max >= bounds.max - 0.05;
  if (!wide) {
    parts.push(Math.abs(f.min - f.max) < 0.05
      ? fmtWeight(f.min)
      : `${fmtWeight(f.min)} — ${fmtWeight(f.max)}`);
  }
  return parts;
}

export function LabFilters({ state, onChange, bounds, purityOptions, matches, total }: Props) {
  const { t } = useLabLang();
  const [open, setOpen] = useState(false);
  const LOG_MIN = Math.log(bounds.min);
  const LOG_MAX = Math.log(bounds.max);
  const toPos   = (w: number) => Math.round(((Math.log(w) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 1000);
  const fromPos = (p: number) => Math.exp(LOG_MIN + (p / 1000) * (LOG_MAX - LOG_MIN));

  const set = (patch: Partial<FilterState>) => onChange({ ...state, ...patch });

  const posMin = toPos(state.min);
  const posMax = toPos(state.max);
  const exact  = Math.abs(state.min - state.max) < 0.05;

  /** Redondeo amable: nadie quiere filtrar por 47,3184 g. */
  const snap = (w: number) => (w < 10 ? Math.round(w * 10) / 10 : w < 100 ? Math.round(w) : Math.round(w / 5) * 5);

  const pristine = isPristine(state, bounds);

  const applied = summarise(state, bounds, t);

  return (
    <div className="lab-filters" data-lab-in data-open={open ? "true" : "false"}>
      <button
        type="button"
        className="lab-filters-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="lab-filters-body"
      >
        <span className="lab-filters-toggle-main">
          <span aria-hidden className="lab-filters-icon">
            <i /><i /><i />
          </span>
          <span className="lab-label">{t("f.filter")}</span>
        </span>

        <span className="lab-filters-applied">
          {applied.length > 0
            ? applied.map((a) => <span key={a} className="lab-tag">{a}</span>)
            : <span className="lab-label" style={{ color: "var(--lab-ink-4)" }}>{t("f.whole")}</span>}
        </span>

        <span className="lab-label lab-filters-count">
          <b key={matches} className="lab-count">{String(matches).padStart(2, "0")}</b>
          <span> / {String(total).padStart(2, "0")}</span>
        </span>

        <span aria-hidden className="lab-filters-chevron">
          <svg viewBox="0 0 16 16" width="13" height="13">
            <path d="M3 6 L8 11 L13 6" fill="none" stroke="currentColor" strokeWidth="1.4"
                  strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {/* grid-template-rows 0fr→1fr: se abre a su altura natural sin medirla */}
      <div className="lab-filters-drawer" id="lab-filters-body">
        <div className="lab-filters-body" aria-hidden={!open}>
      <div className="lab-filters-row">
        <Segment<Metal>
          label={t("f.metal")}
          value={state.metal}
          onChange={(v) => set({ metal: v })}
          options={[{ v: "todo", t: t("f.all") }, { v: "oro", t: t("f.gold") }, { v: "plata", t: t("f.silver") }]}
        />

        <Segment<Kind>
          label={t("f.format")}
          value={state.kind}
          onChange={(v) => set({ kind: v })}
          options={[{ v: "todo", t: t("f.all") }, { v: "lingote", t: t("f.bar") }, { v: "moneda", t: t("f.coin") }]}
        />

        <Segment<Purity>
          label={t("f.purity")}
          value={state.purity}
          onChange={(v) => set({ purity: v })}
          options={[
            { v: "todo" as Purity, t: t("f.allF") },
            ...purityOptions.map((p) => ({ v: p as Purity, t: fmtPurity(p) })),
          ]}
        />
      </div>

      <div className="lab-filters-row lab-filters-row--weight">
        <div className="lab-filter-group lab-filter-group--grow">
          <span className="lab-label lab-filter-label">
            {t("f.weight")} · {t(exact ? "f.exact" : "f.range")}
          </span>

          <div className="lab-range" style={{ "--a": `${posMin / 10}%`, "--b": `${posMax / 10}%` } as React.CSSProperties}>
            <span className="lab-range-rail" aria-hidden />
            <span className="lab-range-fill" aria-hidden />
            <input
              type="range" min={0} max={1000} value={posMin}
              aria-label={t("f.min")}
              onChange={(e) => {
                const v = snap(fromPos(Number(e.target.value)));
                set({ min: Math.min(v, state.max) });
              }}
            />
            <input
              type="range" min={0} max={1000} value={posMax}
              aria-label={t("f.max")}
              onChange={(e) => {
                const v = snap(fromPos(Number(e.target.value)));
                set({ max: Math.max(v, state.min) });
              }}
            />
          </div>
        </div>

        <div className="lab-filter-group">
          <span className="lab-label lab-filter-label">{t("f.grams")}</span>
          <div className="lab-grams">
            <input
              type="number" className="lab-input lab-grams-input" min={bounds.min} max={bounds.max}
              step="0.1" value={state.min} aria-label={t("f.from")}
              onChange={(e) => set({ min: Math.max(bounds.min, Math.min(Number(e.target.value) || bounds.min, state.max)) })}
            />
            <span aria-hidden className="lab-grams-dash">—</span>
            <input
              type="number" className="lab-input lab-grams-input" min={bounds.min} max={bounds.max}
              step="0.1" value={state.max} aria-label={t("f.to")}
              onChange={(e) => set({ max: Math.min(bounds.max, Math.max(Number(e.target.value) || bounds.max, state.min)) })}
            />
          </div>
        </div>
      </div>

      <div className="lab-filters-foot">
        <span className="lab-label" style={{ color: "var(--lab-ink-3)" }}>
          <b key={matches} className="lab-count">{String(matches).padStart(2, "0")}</b>
          <span> / {String(total).padStart(2, "0")}</span>
        </span>

        <span className="lab-label lab-filters-hint">
          {exact ? `${t("f.weight")} · ${fmtWeight(state.min)}` : `${fmtWeight(state.min)} — ${fmtWeight(state.max)}`}
        </span>

        <button
          type="button"
          className="lab-filters-reset"
          data-on={pristine ? "false" : "true"}
          onClick={() => onChange({ metal: "todo", kind: "todo", purity: "todo", min: bounds.min, max: bounds.max })}
        >
          Limpiar
        </button>
          </div>
        </div>
      </div>
    </div>
  );
}
