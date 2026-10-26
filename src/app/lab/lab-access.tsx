"use client";

import { useEffect, useRef, useState } from "react";
import { useLabLang } from "./lab-lang";
import { DEMO_EMAIL, DEMO_PASS, useLabSession, type LabEstado } from "./lab-session";
import { downloadLabInvoice } from "./lab-invoice";
import type { LabCompany, LabProduct } from "./lab-experience";
import { Segment } from "./lab-segment";

/** Los mismos cuatro estados de mis-reservas.tsx, traducidos por diccionario. */
const ESTADO_KEY: Record<LabEstado, string> = {
  pendiente:  "st.pendiente",
  confirmada: "st.confirmada",
  entregada:  "st.entregada",
  cancelada:  "st.cancelada",
};

/* ═══════════════════════════════════════════════════════════════════════════
   Acceso privado: pantalla completa, no ventana.

   Una tarjeta flotando sobre el catálogo confunde — no se sabe si sigues en la
   página o has salido de ella. Esto es una toma de pantalla entera, con su
   propio aire: el argumento a un lado, el formulario al otro. Entrar a la zona
   privada debe sentirse como cruzar una puerta, no como abrir un diálogo.

   ⚠ La sesión es simulada (ver lab-session.tsx). Las credenciales van escritas
   en la propia pantalla porque esto es un prototipo para enseñar el diseño.
   ═══════════════════════════════════════════════════════════════════════════ */

export function LabAccess({
  products, company, onClose,
}: {
  products: LabProduct[];
  company:  LabCompany;
  onClose:  () => void;
}) {
  const { session, orders, signIn, signOut, seed } = useLabSession();
  const { t, money, date } = useLabLang();
  const [filtro, setFiltro] = useState<LabEstado | "todas">("todas");
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy]   = useState(false);
  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.dispatchEvent(new CustomEvent("lab:freeze", { detail: { on: true } }));
    window.addEventListener("keydown", onKey);
    screenRef.current?.focus();
    return () => {
      window.dispatchEvent(new CustomEvent("lab:freeze", { detail: { on: false } }));
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const err = signIn(email, pass);
    setError(err);
    // Historial de muestra solo si entra bien y aún no hay nada guardado
    if (!err) seed(products);
    setBusy(false);
  }

  async function getInvoice(id: string) {
    const r = orders.find((o) => o.id === id);
    if (!r) return;
    setPdfBusy(id);
    setPdfError(null);
    try { await downloadLabInvoice(r, company); }
    catch { setPdfError(t("ac.pdfError")); }
    finally { setPdfBusy(null); }
  }

  const visibles = filtro === "todas" ? orders : orders.filter((o) => o.estado === filtro);

  /** Solo se ofrecen los estados que el cliente tiene: filtrar a cero no sirve. */
  const presentes = [...new Set(orders.map((o) => o.estado))];

  const fmtDate = (iso: string) =>
    date(iso, { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div
      className="lab-screen"
      role="dialog"
      aria-modal="true"
      aria-label={t(session ? "ac.account" : "nav.access")}
      data-lab-native
      ref={screenRef}
      tabIndex={-1}
    >
      <div className="lab-screen-glow" aria-hidden />

      <header className="lab-screen-top">
        <span className="lab-nav-mark">Lingot</span>
        <button type="button" className="lab-screen-back" onClick={onClose}>
          <span aria-hidden className="lab-screen-back-icon">
            <svg viewBox="0 0 16 16" width="13" height="13">
              <path d="M10 3 L5 8 L10 13" fill="none" stroke="currentColor" strokeWidth="1.4"
                    strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="lab-label">{t("ac.back")}</span>
        </button>
      </header>

      {!session ? (
        <div className="lab-screen-grid">
          <div className="lab-screen-side">
            <span className="lab-label" style={{ color: "var(--lab-metal)" }}>{t("nav.access")}</span>
            <h2 className="lab-screen-title">{t("ac.title1")}<br />{t("ac.title2")}</h2>
            <p className="lab-body lab-screen-lead">
              {t("ac.lead")}
            </p>

            {/* Prototipo: sin esto no hay forma de probar la pantalla de cliente */}
            <p className="lab-screen-demo">
              <b>{t("ac.demo")}</b>
              <span>{DEMO_EMAIL} · {DEMO_PASS}</span>
              <span>{t("ac.demoNote")}</span>
            </p>
          </div>

          <div className="lab-screen-panel">
            <form onSubmit={submit} className="lab-screen-form">
              <div className="lab-field">
                <label className="lab-label" htmlFor="lab-email">{t("ac.email")}</label>
                <input id="lab-email" type="email" autoComplete="username" className="lab-input"
                       value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="lab-field">
                <label className="lab-label" htmlFor="lab-pass">{t("ac.pass")}</label>
                <input id="lab-pass" type="password" autoComplete="current-password" className="lab-input"
                       value={pass} onChange={(e) => setPass(e.target.value)} required />
              </div>

              {error && <p className="lab-detail-error">{t(error)}</p>}

              <button type="submit" className="lab-cta lab-screen-submit" disabled={busy}>
                {t(busy ? "ac.entering" : "ac.enter")}
              </button>

              <a className="lab-detail-alt" href="tel:+34669393197">
                {t("ac.noAccount")}
              </a>
            </form>
          </div>
        </div>
      ) : (
        <div className="lab-screen-grid">
          <div className="lab-screen-side">
            <span className="lab-label" style={{ color: "var(--lab-metal)" }}>{t("ac.account")}</span>
            <h2 className="lab-screen-title">{t("ac.hi")}<br />{session.name.split(" ")[0]}.</h2>
            <p className="lab-body lab-screen-lead">{session.email}</p>

            <button type="button" className="lab-cta lab-screen-out"
                    onClick={() => { signOut(); onClose(); }}>
              {t("ac.out")}
            </button>
          </div>

          <div className="lab-screen-panel">
            <div className="lab-screen-orders-head">
              <span className="lab-label" style={{ color: "var(--lab-metal-deep)" }}>{t("ac.orders")}</span>
              <span className="lab-label" style={{ color: "var(--lab-ink-3)" }}>
                {String(visibles.length).padStart(2, "0")} / {String(orders.length).padStart(2, "0")}
              </span>
            </div>

            {presentes.length > 1 && (
              <div className="lab-screen-filter">
                <Segment<LabEstado | "todas">
                  label={t("f.state")}
                  value={filtro}
                  onChange={setFiltro}
                  options={[
                    { v: "todas" as const, t: t("st.all") },
                    ...presentes.map((e) => ({ v: e, t: t(ESTADO_KEY[e]) })),
                  ]}
                />
              </div>
            )}

            {pdfError && <p className="lab-detail-error">{pdfError}</p>}

            {orders.length === 0 ? (
              <p className="lab-body lab-screen-empty">
                {t("ac.none")}
              </p>
            ) : visibles.length === 0 ? (
              <p className="lab-body lab-screen-empty">
                {t("ac.noneState")}
              </p>
            ) : (
              <ul className="lab-screen-list" data-lab-native>
                {visibles.map((o) => (
                  <li key={o.id} className="lab-screen-item">
                    <div>
                      <div className="lab-h lab-screen-item-name">{o.name}</div>
                      <div className="lab-label lab-screen-item-meta">
                        {fmtDate(o.at)} · {o.quantity} {t(o.quantity === 1 ? "ac.unit" : "ac.units")}
                      </div>
                    </div>
                    <div className="lab-screen-item-right">
                      <span className="lab-num lab-screen-item-price">
                        {o.price != null ? money(o.price * o.quantity) : t("d.ask")}
                      </span>
                      <span className="lab-estado" data-estado={o.estado}>{t(ESTADO_KEY[o.estado])}</span>

                      {o.factura && (
                        <button
                          type="button"
                          className="lab-invoice"
                          onClick={() => getInvoice(o.id)}
                          disabled={pdfBusy === o.id}
                        >
                          {pdfBusy === o.id ? t("ac.generating") : t("ac.invoice", { code: o.factura })}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
