"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { downloadDocumentPdf } from "@/lib/pdf/document-pdf";
import { getClientDocumentPdfAction } from "./actions";
import { CatalogFooter } from "../catalog-footer";

interface Props {
  user: { email: string; name: string };
  isWholesale: boolean;
  reservations: Array<{
    id: string; created_at: string; product_name: string; product_sku: string | null;
    quantity: number; price_snapshot: number; phone: string | null; note: string | null; status: string;
  }>;
  documents: Array<{
    id: string; code: string | null; doc_type: string; issue_date: string; total: number | null; status: string;
  }>;
}

type Tab = "datos" | "reservas" | "historico";

const RESERVATION_STATUS: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pendiente:  { label: "Pendiente",  bg: "rgba(200,161,100,0.10)", color: "var(--lg-gold-deep)", border: "rgba(200,161,100,0.28)" },
  confirmada: { label: "Confirmada", bg: "rgba(15,74,92,0.09)",     color: "var(--lg-vault-soft)", border: "rgba(15,74,92,0.24)" },
  entregada:  { label: "Entregada",  bg: "rgba(22,120,80,0.09)",    color: "#167850",              border: "rgba(22,120,80,0.24)" },
  cancelada:  { label: "Cancelada",  bg: "rgba(180,60,50,0.08)",    color: "#b4392f",              border: "rgba(180,60,50,0.22)" },
};

const DOCUMENT_STATUS: Record<string, { label: string; bg: string; color: string; border: string }> = {
  borrador:  { label: "Borrador",  bg: "rgba(120,120,120,0.08)", color: "#7d7d7d",              border: "rgba(120,120,120,0.2)" },
  emitido:   { label: "Emitido",   bg: "rgba(15,74,92,0.09)",    color: "var(--lg-vault-soft)", border: "rgba(15,74,92,0.24)" },
  pagado:    { label: "Pagado",    bg: "rgba(22,120,80,0.09)",   color: "#167850",              border: "rgba(22,120,80,0.24)" },
  vencido:   { label: "Vencido",   bg: "rgba(200,90,10,0.09)",   color: "#c05a0a",              border: "rgba(200,90,10,0.24)" },
  cancelado: { label: "Cancelado", bg: "rgba(180,60,50,0.08)",   color: "#b4392f",              border: "rgba(180,60,50,0.22)" },
};

function StatusBadge({ map, status }: { map: Record<string, { label: string; bg: string; color: string; border: string }>; status: string }) {
  const s = map[status] ?? { label: status, bg: "rgba(120,120,120,0.08)", color: "#7d7d7d", border: "rgba(120,120,120,0.2)" };
  return (
    <span className="lg-label" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: "4px 11px", fontSize: "9px", letterSpacing: "0.2em", borderRadius: "99px", whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

const DOC_TYPE_LABELS: Record<string, string> = {
  factura: "Factura", factura_rectificativa: "Factura rectificativa", albaran: "Albarán", presupuesto: "Presupuesto", nota_cargo: "Nota de cargo",
};

export function MiCuentaView({ user, isWholesale, reservations, documents }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("datos");
  const tabs: { id: Tab; label: string }[] = [
    { id: "datos", label: "Mis datos" },
    { id: "reservas", label: "Mis reservas" },
    { id: "historico", label: "Mi histórico" },
  ];

  return (
    <div className="lg-scope" style={{ minHeight: "100dvh", background: "var(--lg-paper)" }}>
      <div aria-hidden className="lg-grain" />

      {/* ── Hero bóveda ─────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden px-6"
        style={{ background: "radial-gradient(120% 100% at 80% 0%, #0f4a5c 0%, #0a3746 46%, #06272f 100%)", paddingTop: "clamp(120px, 16vw, 170px)", paddingBottom: "clamp(48px, 7vw, 72px)" }}>
        <div aria-hidden className="pointer-events-none absolute select-none"
          style={{ right: "-1vw", top: "0", fontSize: "clamp(140px, 26vw, 300px)", fontWeight: 300, lineHeight: 0.85, color: "rgba(238,242,244,0.03)", letterSpacing: "-0.05em" }}>MC</div>

        <div className="relative mx-auto" style={{ maxWidth: "820px", zIndex: 2 }}>
          <Link href="/catalogo" className="lg-label mb-8 inline-flex items-center gap-2"
            style={{ fontSize: "9px", letterSpacing: "0.28em", color: "var(--lg-light-soft)", textDecoration: "none" }}>← Catálogo</Link>
          <div className="mb-4 inline-flex items-center rounded-full px-3 py-1"
            style={{ background: "rgba(238,242,244,0.05)", border: "1px solid rgba(238,242,244,0.14)" }}>
            <span className="lg-label" style={{ fontSize: "8px", letterSpacing: "0.42em", color: "rgba(228,200,143,0.72)" }}>Mi cuenta</span>
          </div>
          <h1 className="lg-display" style={{ fontSize: "clamp(30px, 5vw, 54px)", color: "var(--lg-light)", fontWeight: 300, margin: "0 0 10px" }}>{user.name}</h1>
          <div className="lg-num" style={{ fontSize: "12px", color: "var(--lg-light-dim)" }}>{user.email}</div>
          {isWholesale && (
            <div className="mt-4 inline-flex items-center rounded-full px-3 py-1" style={{ background: "rgba(200,161,100,0.12)", border: "1px solid var(--lg-gold-line)" }}>
              <span className="lg-label" style={{ fontSize: "8px", letterSpacing: "0.28em", color: "var(--lg-gold-bright)" }}>Precios mayorista</span>
            </div>
          )}
        </div>
      </header>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(236,239,242,0.92)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid var(--lg-ink-faint)" }}>
        <div style={{ maxWidth: "820px", margin: "0 auto", padding: "0 24px", display: "flex" }}>
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="lg-label"
              style={{
                background: "none", border: "none",
                borderBottom: activeTab === tab.id ? "2px solid var(--lg-gold)" : "2px solid transparent",
                padding: "17px 20px 15px", fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase",
                color: activeTab === tab.id ? "var(--lg-ink)" : "var(--lg-ink-dim)",
                cursor: "pointer", transition: "color 0.25s var(--lg-spring), border-color 0.25s var(--lg-spring)", whiteSpace: "nowrap",
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "44px 24px 80px" }}>
        {activeTab === "datos"     && <MisDatos user={user} isWholesale={isWholesale} />}
        {activeTab === "reservas"  && <MisReservas reservations={reservations} />}
        {activeTab === "historico" && <MiHistorico documents={documents} />}
      </div>

      <CatalogFooter compact />
    </div>
  );
}

function Card({ children, pad = "32px" }: { children: React.ReactNode; pad?: string }) {
  return <div className="rounded-2xl" style={{ background: "var(--lg-surface)", border: "1px solid var(--lg-ink-faint)", padding: pad, boxShadow: "0 1px 2px rgba(10,43,54,0.03)" }}>{children}</div>;
}

function MisDatos({ user, isWholesale }: { user: { email: string; name: string }; isWholesale: boolean }) {
  const fields = [
    { label: "Nombre", value: user.name },
    { label: "Email", value: user.email },
    { label: "Tipo de cuenta", value: isWholesale ? "Mayorista" : "Minorista" },
  ];
  return (
    <Card>
      <div className="lg-heading" style={{ fontSize: "clamp(17px, 2vw, 21px)", color: "var(--lg-ink)", fontWeight: 400, marginBottom: "28px", paddingBottom: "20px", borderBottom: "1px solid var(--lg-ink-faint)" }}>
        Información de perfil
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {fields.map((f) => (
          <div key={f.label}>
            <div className="lg-label" style={{ fontSize: "9px", letterSpacing: "0.28em", color: "var(--lg-ink-dim)", marginBottom: "7px" }}>{f.label}</div>
            <div style={{ fontSize: "15px", color: "var(--lg-ink)", fontWeight: f.label === "Nombre" ? 500 : 400 }}>{f.value}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MisReservas({ reservations }: { reservations: Props["reservations"] }) {
  if (reservations.length === 0) {
    return (
      <Card pad="64px 32px">
        <div className="text-center">
          <div className="lg-heading" style={{ fontSize: "19px", color: "var(--lg-ink-dim)", fontWeight: 300, marginBottom: "12px" }}>Sin reservas activas</div>
          <p className="lg-label" style={{ fontSize: "10px", letterSpacing: "0.24em", color: "var(--lg-ink-faint)" }}>Explora el catálogo para realizar tu primera reserva</p>
          <Link href="/catalogo" className="lg-btn lg-label mt-6 inline-flex items-center gap-2"
            style={{ padding: "11px 20px", borderRadius: "99px", background: "var(--lg-vault)", color: "var(--lg-light)", fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", textDecoration: "none" }}>
            Ver catálogo
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px]" style={{ background: "rgba(238,242,244,0.14)" }}>↗</span>
          </Link>
        </div>
      </Card>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {reservations.map((r) => (
        <Card key={r.id} pad="22px 24px">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
            <div>
              <div className="lg-heading" style={{ fontSize: "16px", color: "var(--lg-ink)", fontWeight: 400, marginBottom: "3px" }}>{r.product_name}</div>
              {r.product_sku && <div className="lg-label" style={{ fontSize: "9px", color: "var(--lg-ink-dim)", letterSpacing: "0.18em" }}>{r.product_sku}</div>}
            </div>
            <StatusBadge map={RESERVATION_STATUS} status={r.status} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center" }}>
            <span className="lg-num" style={{ fontSize: "14px", color: "var(--lg-ink)" }}>{r.quantity} × {formatCurrency(r.price_snapshot)}</span>
            <span className="lg-label" style={{ fontSize: "10px", letterSpacing: "0.08em", color: "var(--lg-ink-dim)" }}>{formatDate(r.created_at)}</span>
          </div>
          {(r.phone || r.note) && (
            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--lg-ink-faint)", display: "flex", flexDirection: "column", gap: "5px" }}>
              {r.phone && <span className="lg-label" style={{ fontSize: "10px", letterSpacing: "0.06em", color: "var(--lg-ink-soft)" }}>Tel: {r.phone}</span>}
              {r.note && <span style={{ fontSize: "13px", color: "var(--lg-ink-soft)" }}>{r.note}</span>}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function DownloadInvoiceButton({ documentId }: { documentId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const result = await getClientDocumentPdfAction(documentId);
      if (!result.success) { setError(result.error); return; }
      await downloadDocumentPdf(result.payload);
    } catch { setError("No se pudo generar el PDF."); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
      <button type="button" onClick={handleClick} disabled={loading} className="lg-btn lg-label"
        style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: loading ? "var(--lg-ink-dim)" : "var(--lg-gold-deep)", background: "rgba(200,161,100,0.07)", border: "1px solid var(--lg-gold-line)", borderRadius: "999px", padding: "7px 15px", cursor: loading ? "default" : "pointer" }}>
        {loading ? "Generando…" : "Descargar PDF"}
      </button>
      {error && <span className="lg-label" style={{ fontSize: "9px", color: "#b4392f" }}>{error}</span>}
    </div>
  );
}

function MiHistorico({ documents }: { documents: Props["documents"] }) {
  if (documents.length === 0) {
    return (
      <Card pad="56px 32px">
        <div className="text-center">
          <div className="lg-heading" style={{ fontSize: "19px", color: "var(--lg-ink-dim)", fontWeight: 300, marginBottom: "8px" }}>Sin documentos registrados</div>
          <p style={{ fontSize: "12px", color: "var(--lg-ink-soft)", lineHeight: 1.6 }}>Si has realizado compras, contacta con nosotros para asociarlas a tu cuenta.</p>
        </div>
      </Card>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {documents.map((doc) => (
        <Card key={doc.id} pad="18px 24px">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <div className="lg-label" style={{ fontSize: "9px", letterSpacing: "0.22em", color: "var(--lg-ink-dim)" }}>{DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}</div>
              <div className="lg-heading" style={{ fontSize: "15px", color: "var(--lg-ink)", fontWeight: 500 }}>{doc.code ?? "—"}</div>
              <div className="lg-label" style={{ fontSize: "10px", letterSpacing: "0.06em", color: "var(--lg-ink-dim)" }}>{formatDate(doc.issue_date)}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
              <StatusBadge map={DOCUMENT_STATUS} status={doc.status} />
              <span className="lg-num" style={{ fontSize: "18px", fontWeight: 500, color: "var(--lg-ink)" }}>{doc.total != null ? formatCurrency(doc.total) : "—"}</span>
              <DownloadInvoiceButton documentId={doc.id} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
