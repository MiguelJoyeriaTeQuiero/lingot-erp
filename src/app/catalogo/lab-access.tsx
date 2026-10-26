"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { getClientDocumentPdfAction } from "./mi-cuenta/actions";
import { useLabLang } from "./lab-lang";
import { useLabSession, type LabEstado } from "./lab-session";
import { Segment } from "./lab-segment";
import { LAB_PATHS } from "./lab-paths";

/** Los mismos cuatro estados de mis-reservas.tsx, traducidos por diccionario. */
const ESTADO_KEY: Record<LabEstado, string> = {
  pendiente:  "st.pendiente",
  confirmada: "st.confirmada",
  entregada:  "st.entregada",
  cancelada:  "st.cancelada",
};

type Vista = "reservas" | "documentos";

/* ═══════════════════════════════════════════════════════════════════════════
   Acceso privado: pantalla completa, no ventana.

   Una tarjeta flotando sobre el catálogo confunde — no se sabe si sigues en la
   página o has salido de ella. Esto es una toma de pantalla entera, con su
   propio aire: el argumento a un lado, el formulario al otro. Entrar a la zona
   privada debe sentirse como cruzar una puerta, no como abrir un diálogo.

   Reservas y documentos van en vistas separadas porque en la base no están
   unidos: una reserva no apunta a la factura que acaba generando.

   La misma pantalla sirve de capa sobre la portada (LabAccess) y de página
   propia en /mi-cuenta (LabAccountPage); solo cambia cómo se vuelve.
   ═══════════════════════════════════════════════════════════════════════════ */

function BackIcon() {
  return (
    <span aria-hidden className="lab-screen-back-icon">
      <svg viewBox="0 0 16 16" width="13" height="13">
        <path d="M10 3 L5 8 L10 13" fill="none" stroke="currentColor" strokeWidth="1.4"
              strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** Capa a pantalla completa sobre la portada. */
export function LabAccess({ onClose }: { onClose: () => void }) {
  const { session } = useLabSession();
  const { t } = useLabLang();
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
      <AccountScreen
        back={
          <button type="button" className="lab-screen-back" onClick={onClose}>
            <BackIcon />
            <span className="lab-label">{t("ac.back")}</span>
          </button>
        }
        onSignedOut={onClose}
      />
    </div>
  );
}

/** «Mi cuenta» como página: sin sesión enseña el acceso; al salir se queda en él. */
export function LabAccountPage() {
  const { t } = useLabLang();
  return (
    <main className="lab-screen lab-screen--page" data-lab-native>
      <AccountScreen
        back={
          <Link href={LAB_PATHS.home} className="lab-screen-back">
            <BackIcon />
            <span className="lab-label">{t("ac.back")}</span>
          </Link>
        }
      />
    </main>
  );
}

function AccountScreen({ back, onSignedOut }: { back: ReactNode; onSignedOut?: () => void }) {
  const { session, orders, documents, signIn, signOut } = useLabSession();
  const { t, money, date } = useLabLang();
  const [vista, setVista] = useState<Vista>("reservas");
  const [filtro, setFiltro] = useState<LabEstado | "todas">("todas");
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy]   = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await signIn(email, pass);
    // Si entra, el servidor vuelve a pintar la página y esta pantalla pasa sola
    // a la zona de cliente: hasta entonces el botón sigue en «Entrando…».
    if (err) { setError(err); setBusy(false); return; }
    setPass("");
  }

  async function getPdf(id: string) {
    setPdfBusy(id);
    setPdfError(null);
    try {
      const result = await getClientDocumentPdfAction(id);
      if (!result.success) { setPdfError(t("ac.pdfError")); return; }
      // El generador de PDF pesa: solo se descarga cuando alguien pide una factura
      const { downloadDocumentPdf } = await import("@/lib/pdf/document-pdf");
      await downloadDocumentPdf(result.payload);
    }
    catch { setPdfError(t("ac.pdfError")); }
    finally { setPdfBusy(null); }
  }

  const visibles = filtro === "todas" ? orders : orders.filter((o) => o.estado === filtro);

  /** Solo se ofrecen los estados que el cliente tiene: filtrar a cero no sirve. */
  const presentes = [...new Set(orders.map((o) => o.estado))];

  const fmtDate = (iso: string) =>
    date(iso, { day: "2-digit", month: "long", year: "numeric" });

  /** Un tipo o estado que el diccionario no conoce se enseña tal cual, no como clave. */
  const label = (key: string, raw: string) => {
    const s = t(key);
    return s === key ? raw : s;
  };

  return (
    <>
      <div className="lab-screen-glow" aria-hidden />

      <header className="lab-screen-top">
        <Link href={LAB_PATHS.home} className="lab-nav-mark">Lingot</Link>
        {back}
      </header>

      {!session ? (
        <div className="lab-screen-grid">
          <div className="lab-screen-side">
            <span className="lab-label" style={{ color: "var(--lab-metal)" }}>{t("nav.access")}</span>
            <h2 className="lab-screen-title">{t("ac.title1")}<br />{t("ac.title2")}</h2>
            <p className="lab-body lab-screen-lead">
              {t("ac.lead")}
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
            {session.isWholesale && (
              <span className="lab-chip lab-screen-tier">{t("ac.wholesale")}</span>
            )}

            <button type="button" className="lab-cta lab-screen-out"
                    onClick={() => { void signOut(); onSignedOut?.(); }}>
              {t("ac.out")}
            </button>
          </div>

          <div className="lab-screen-panel">
            <div className="lab-screen-filter lab-screen-tabs">
              <Segment<Vista>
                label={t("ac.account")}
                value={vista}
                onChange={setVista}
                options={[
                  { v: "reservas",   t: t("ac.tabOrders") },
                  { v: "documentos", t: t("ac.tabDocs") },
                ]}
              />
            </div>

            {vista === "reservas" ? (
              <>
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
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <>
                <div className="lab-screen-orders-head">
                  <span className="lab-label" style={{ color: "var(--lab-metal-deep)" }}>{t("ac.docs")}</span>
                  <span className="lab-label" style={{ color: "var(--lab-ink-3)" }}>
                    {String(documents.length).padStart(2, "0")}
                  </span>
                </div>

                {pdfError && <p className="lab-detail-error">{pdfError}</p>}

                {documents.length === 0 ? (
                  <p className="lab-body lab-screen-empty">
                    {t("ac.noDocs")}
                  </p>
                ) : (
                  <ul className="lab-screen-list" data-lab-native>
                    {documents.map((d) => (
                      <li key={d.id} className="lab-screen-item">
                        <div>
                          <div className="lab-h lab-screen-item-name">{d.code ?? "—"}</div>
                          <div className="lab-label lab-screen-item-meta">
                            {label(`doc.${d.type}`, d.type)} · {fmtDate(d.date)}
                          </div>
                        </div>
                        <div className="lab-screen-item-right">
                          <span className="lab-num lab-screen-item-price">
                            {d.total != null ? money(d.total) : "—"}
                          </span>
                          <span className="lab-estado" data-estado={d.estado}>{label(`ds.${d.estado}`, d.estado)}</span>
                          <button
                            type="button"
                            className="lab-invoice"
                            onClick={() => getPdf(d.id)}
                            disabled={pdfBusy === d.id}
                          >
                            {pdfBusy === d.id ? t("ac.generating") : t("ac.pdf")}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
