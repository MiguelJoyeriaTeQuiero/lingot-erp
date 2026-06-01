"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { downloadDocumentPdf } from "@/lib/pdf/document-pdf";
import { getClientDocumentPdfAction } from "./actions";

interface Props {
  user: { email: string; name: string };
  isWholesale: boolean;
  reservations: Array<{
    id: string;
    created_at: string;
    product_name: string;
    product_sku: string | null;
    quantity: number;
    price_snapshot: number;
    phone: string | null;
    note: string | null;
    status: string;
  }>;
  documents: Array<{
    id: string;
    code: string | null;
    doc_type: string;
    issue_date: string;
    total: number | null;
    status: string;
  }>;
}

type Tab = "datos" | "reservas" | "historico";

const SPRING = "cubic-bezier(0.32, 0.72, 0, 1)";

// ── Status config ─────────────────────────────────────────────────────────────

const RESERVATION_STATUS: Record<
  string,
  { label: string; bg: string; color: string; border: string }
> = {
  pendiente: {
    label:  "Pendiente",
    bg:     "rgba(154,114,48,0.08)",
    color:  "#9a7230",
    border: "rgba(154,114,48,0.22)",
  },
  confirmada: {
    label:  "Confirmada",
    bg:     "rgba(10,55,70,0.07)",
    color:  "#0a3746",
    border: "rgba(10,55,70,0.20)",
  },
  entregada: {
    label:  "Entregada",
    bg:     "rgba(22,120,80,0.07)",
    color:  "#167850",
    border: "rgba(22,120,80,0.20)",
  },
  cancelada: {
    label:  "Cancelada",
    bg:     "rgba(180,30,30,0.06)",
    color:  "#b41e1e",
    border: "rgba(180,30,30,0.18)",
  },
};

const DOCUMENT_STATUS: Record<
  string,
  { label: string; bg: string; color: string; border: string }
> = {
  borrador: {
    label:  "Borrador",
    bg:     "rgba(120,120,120,0.07)",
    color:  "#888",
    border: "rgba(120,120,120,0.18)",
  },
  emitido: {
    label:  "Emitido",
    bg:     "rgba(10,55,70,0.07)",
    color:  "#0a3746",
    border: "rgba(10,55,70,0.20)",
  },
  pagado: {
    label:  "Pagado",
    bg:     "rgba(22,120,80,0.07)",
    color:  "#167850",
    border: "rgba(22,120,80,0.20)",
  },
  vencido: {
    label:  "Vencido",
    bg:     "rgba(200,80,0,0.07)",
    color:  "#c85000",
    border: "rgba(200,80,0,0.20)",
  },
  cancelado: {
    label:  "Cancelado",
    bg:     "rgba(180,30,30,0.06)",
    color:  "#b41e1e",
    border: "rgba(180,30,30,0.18)",
  },
};

function StatusBadge({
  map,
  status,
}: {
  map: Record<string, { label: string; bg: string; color: string; border: string }>;
  status: string;
}) {
  const s = map[status] ?? {
    label: status, bg: "rgba(120,120,120,0.07)", color: "#888", border: "rgba(120,120,120,0.18)",
  };
  return (
    <span
      style={{
        background:    s.bg,
        color:         s.color,
        border:        `1px solid ${s.border}`,
        padding:       "3px 10px",
        fontFamily:    "monospace",
        fontSize:      "9px",
        textTransform: "uppercase",
        letterSpacing: "0.20em",
        borderRadius:  "99px",
        whiteSpace:    "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

const DOC_TYPE_LABELS: Record<string, string> = {
  factura:              "Factura",
  factura_rectificativa:"Factura rectificativa",
  albaran:              "Albarán",
  presupuesto:          "Presupuesto",
  nota_cargo:           "Nota de cargo",
};

// ── Main ─────────────────────────────────────────────────────────────────────

export function MiCuentaView({ user, isWholesale, reservations, documents }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("datos");

  const tabs: { id: Tab; label: string }[] = [
    { id: "datos",    label: "Mis datos"    },
    { id: "reservas", label: "Mis reservas" },
    { id: "historico",label: "Mi histórico" },
  ];

  return (
    <div style={{ minHeight: "100dvh", background: "#F9F4EC" }}>

      {/* ── Film grain ──────────────────────────────────────────────────── */}
      <div aria-hidden className="catalog-grain-overlay" />

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <header
        style={{
          background:    "linear-gradient(160deg, #EDE5D4 0%, #F4EDE0 60%, #F9F4EC 100%)",
          paddingTop:    "clamp(100px, 14vw, 140px)",
          paddingBottom: "clamp(40px, 6vw, 60px)",
          paddingLeft:   "24px",
          paddingRight:  "24px",
          borderBottom:  "1px solid rgba(10,31,43,0.07)",
          position:      "relative",
          overflow:      "hidden",
        }}
      >
        {/* Decorative large letter */}
        <div
          aria-hidden
          style={{
            position:      "absolute",
            right:         "-20px",
            top:           "0",
            fontFamily:    "var(--font-catalog-serif, Georgia, serif)",
            fontSize:      "clamp(160px, 30vw, 320px)",
            fontWeight:    300,
            lineHeight:    0.85,
            color:         "rgba(10,31,43,0.025)",
            userSelect:    "none",
            pointerEvents: "none",
            letterSpacing: "-0.05em",
          }}
        >
          MC
        </div>

        <div style={{ maxWidth: "768px", margin: "0 auto", position: "relative", zIndex: 2 }}>
          {/* Back link */}
          <Link
            href="/catalogo"
            style={{
              display:       "inline-flex",
              alignItems:    "center",
              gap:           "6px",
              fontFamily:    "monospace",
              fontSize:      "9px",
              textTransform: "uppercase",
              letterSpacing: "0.28em",
              color:         "rgba(10,31,43,0.32)",
              textDecoration:"none",
              marginBottom:  "32px",
              transition:    "color 0.20s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(10,31,43,0.65)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(10,31,43,0.32)"; }}
          >
            ← Catálogo
          </Link>

          {/* Eyebrow */}
          <div
            style={{
              display:       "inline-flex",
              alignItems:    "center",
              borderRadius:  "99px",
              padding:       "4px 12px",
              marginBottom:  "14px",
              background:    "rgba(154,114,48,0.07)",
              border:        "1px solid rgba(154,114,48,0.16)",
            }}
          >
            <span style={{
              fontFamily:    "monospace",
              fontSize:      "8px",
              textTransform: "uppercase",
              letterSpacing: "0.42em",
              color:         "rgba(154,114,48,0.65)",
            }}>
              Mi cuenta
            </span>
          </div>

          {/* Name */}
          <h1
            style={{
              fontFamily:    "var(--font-catalog-serif, Georgia, serif)",
              fontWeight:    300,
              fontSize:      "clamp(28px, 4.5vw, 48px)",
              color:         "#0a1f2b",
              margin:        "0 0 8px",
              lineHeight:    1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {user.name}
          </h1>

          {/* Email */}
          <div style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(10,31,43,0.38)" }}>
            {user.email}
          </div>

          {/* Wholesale badge */}
          {isWholesale && (
            <div
              style={{
                display:      "inline-flex",
                alignItems:   "center",
                marginTop:    "14px",
                borderRadius: "99px",
                padding:      "4px 12px",
                background:   "rgba(154,114,48,0.07)",
                border:       "1px solid rgba(154,114,48,0.22)",
              }}
            >
              <span style={{
                fontFamily:    "monospace",
                fontSize:      "8px",
                textTransform: "uppercase",
                letterSpacing: "0.28em",
                color:         "#9a7230",
              }}>
                Precios mayorista
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ── Tab nav ─────────────────────────────────────────────────────── */}
      <nav
        style={{
          position:            "sticky",
          top:                 0,
          zIndex:              30,
          background:          "rgba(249,244,236,0.94)",
          backdropFilter:      "blur(16px)",
          WebkitBackdropFilter:"blur(16px)",
          borderBottom:        "1px solid rgba(10,31,43,0.07)",
        }}
      >
        <div
          style={{
            maxWidth: "768px",
            margin:   "0 auto",
            padding:  "0 24px",
            display:  "flex",
            gap:      "0",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background:  "none",
                border:      "none",
                borderBottom: activeTab === tab.id
                  ? "2px solid #9a7230"
                  : "2px solid transparent",
                padding:       "16px 20px 14px",
                fontFamily:    "monospace",
                fontSize:      "10px",
                textTransform: "uppercase",
                letterSpacing: "0.22em",
                color:         activeTab === tab.id ? "#0a1f2b" : "rgba(10,31,43,0.35)",
                cursor:        "pointer",
                transition:    `color 0.25s ${SPRING}, border-color 0.25s ${SPRING}`,
                whiteSpace:    "nowrap",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth:      "768px",
          margin:        "0 auto",
          padding:       "40px 24px 80px",
        }}
      >
        {activeTab === "datos"     && <MisDatos    user={user} isWholesale={isWholesale} />}
        {activeTab === "reservas"  && <MisReservas  reservations={reservations} />}
        {activeTab === "historico" && <MiHistorico  documents={documents} />}
      </div>
    </div>
  );
}

// ── Mis datos ─────────────────────────────────────────────────────────────────

function MisDatos({ user, isWholesale }: { user: { email: string; name: string }; isWholesale: boolean }) {
  const fields = [
    { label: "Nombre",        value: user.name },
    { label: "Email",         value: user.email },
    { label: "Tipo de cuenta",value: isWholesale ? "Mayorista" : "Minorista" },
  ];

  return (
    <div
      style={{
        padding:      "3px",
        borderRadius: "24px",
        background:   "rgba(154,114,48,0.03)",
        border:       "1px solid rgba(154,114,48,0.12)",
      }}
    >
      <div
        style={{
          borderRadius: "21px",
          background:   "#FFFFFF",
          boxShadow:    "inset 0 1px 0 rgba(255,255,255,0.90)",
          padding:      "32px",
        }}
      >
        <div
          style={{
            fontFamily:    "var(--font-catalog-serif, Georgia, serif)",
            fontWeight:    300,
            fontStyle:     "italic",
            fontSize:      "clamp(16px, 2vw, 20px)",
            color:         "rgba(10,31,43,0.50)",
            marginBottom:  "28px",
            paddingBottom: "20px",
            borderBottom:  "1px solid rgba(10,31,43,0.06)",
          }}
        >
          Información de perfil
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {fields.map((f) => (
            <div key={f.label}>
              <div style={{
                fontFamily:    "monospace",
                fontSize:      "9px",
                textTransform: "uppercase",
                letterSpacing: "0.28em",
                color:         "rgba(10,31,43,0.30)",
                marginBottom:  "6px",
              }}>
                {f.label}
              </div>
              <div style={{
                fontSize:   "15px",
                color:      "#0a1f2b",
                fontWeight: f.label === "Nombre" ? 400 : 300,
              }}>
                {f.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Mis reservas ──────────────────────────────────────────────────────────────

function MisReservas({ reservations }: { reservations: Props["reservations"] }) {
  if (reservations.length === 0) {
    return (
      <div
        style={{
          padding:      "3px",
          borderRadius: "24px",
          background:   "rgba(154,114,48,0.03)",
          border:       "1px solid rgba(154,114,48,0.10)",
        }}
      >
        <div
          style={{
            borderRadius: "21px",
            background:   "#FFFFFF",
            boxShadow:    "inset 0 1px 0 rgba(255,255,255,0.90)",
            padding:      "64px 32px",
            textAlign:    "center",
          }}
        >
          <div
            style={{
              fontFamily:    "var(--font-catalog-serif, Georgia, serif)",
              fontWeight:    300,
              fontStyle:     "italic",
              fontSize:      "18px",
              color:         "rgba(10,31,43,0.28)",
              marginBottom:  "12px",
            }}
          >
            Sin reservas activas
          </div>
          <p style={{ fontFamily: "monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.28em", color: "rgba(10,31,43,0.20)" }}>
            Explora el catálogo para realizar tu primera reserva
          </p>
          <Link
            href="/catalogo"
            style={{
              display:       "inline-flex",
              alignItems:    "center",
              gap:           "8px",
              marginTop:     "24px",
              padding:       "10px 20px",
              borderRadius:  "99px",
              background:    "#0a1f2b",
              color:         "rgba(249,244,236,0.88)",
              fontFamily:    "monospace",
              fontSize:      "9px",
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              textDecoration:"none",
            }}
          >
            Ver catálogo
            <span style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              width:          "18px",
              height:         "18px",
              borderRadius:   "99px",
              background:     "rgba(249,244,236,0.12)",
              fontSize:       "10px",
            }}>↗</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {reservations.map((r) => (
        <div
          key={r.id}
          style={{
            padding:      "3px",
            borderRadius: "20px",
            background:   "rgba(154,114,48,0.03)",
            border:       "1px solid rgba(154,114,48,0.10)",
          }}
        >
          <div
            style={{
              borderRadius: "17px",
              background:   "#FFFFFF",
              boxShadow:    "inset 0 1px 0 rgba(255,255,255,0.90)",
              padding:      "20px 24px",
            }}
          >
            <div style={{
              display:        "flex",
              justifyContent: "space-between",
              alignItems:     "flex-start",
              flexWrap:       "wrap",
              gap:            "8px",
              marginBottom:   "14px",
            }}>
              <div>
                <div style={{
                  fontFamily:    "var(--font-catalog-serif, Georgia, serif)",
                  fontWeight:    400,
                  fontSize:      "16px",
                  color:         "#0a1f2b",
                  marginBottom:  "3px",
                }}>
                  {r.product_name}
                </div>
                {r.product_sku && (
                  <div style={{
                    fontFamily:    "monospace",
                    fontSize:      "9px",
                    color:         "rgba(10,31,43,0.30)",
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                  }}>
                    {r.product_sku}
                  </div>
                )}
              </div>
              <StatusBadge map={RESERVATION_STATUS} status={r.status} />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center" }}>
              <span style={{ fontFamily: "monospace", fontSize: "13px", color: "#0a1f2b" }}>
                {r.quantity} × {formatCurrency(r.price_snapshot)}
              </span>
              <span style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(10,31,43,0.32)" }}>
                {formatDate(r.created_at)}
              </span>
            </div>

            {(r.phone || r.note) && (
              <div style={{
                marginTop:    "12px",
                paddingTop:   "12px",
                borderTop:    "1px solid rgba(10,31,43,0.05)",
                display:      "flex",
                flexDirection:"column",
                gap:          "4px",
              }}>
                {r.phone && (
                  <span style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(10,31,43,0.38)" }}>
                    Tel: {r.phone}
                  </span>
                )}
                {r.note && (
                  <span style={{
                    fontFamily: "var(--font-catalog-serif, Georgia, serif)",
                    fontStyle:  "italic",
                    fontSize:   "13px",
                    color:      "rgba(10,31,43,0.42)",
                  }}>
                    {r.note}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Mi histórico ──────────────────────────────────────────────────────────────

function DownloadInvoiceButton({ documentId }: { documentId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const result = await getClientDocumentPdfAction(documentId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      await downloadDocumentPdf(result.payload);
    } catch {
      setError("No se pudo generar el PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        style={{
          fontFamily:    "monospace",
          fontSize:      "10px",
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          color:         loading ? "rgba(10,31,43,0.30)" : "#9a7230",
          background:    "rgba(154,114,48,0.06)",
          border:        "1px solid rgba(154,114,48,0.22)",
          borderRadius:  "999px",
          padding:       "6px 14px",
          cursor:        loading ? "default" : "pointer",
        }}
      >
        {loading ? "Generando…" : "Descargar PDF"}
      </button>
      {error && (
        <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#b4452f" }}>
          {error}
        </span>
      )}
    </div>
  );
}

function MiHistorico({ documents }: { documents: Props["documents"] }) {
  if (documents.length === 0) {
    return (
      <div
        style={{
          padding:      "3px",
          borderRadius: "24px",
          background:   "rgba(154,114,48,0.03)",
          border:       "1px solid rgba(154,114,48,0.10)",
        }}
      >
        <div
          style={{
            borderRadius: "21px",
            background:   "#FFFFFF",
            boxShadow:    "inset 0 1px 0 rgba(255,255,255,0.90)",
            padding:      "56px 32px",
            textAlign:    "center",
          }}
        >
          <div style={{
            fontFamily: "var(--font-catalog-serif, Georgia, serif)",
            fontWeight: 300,
            fontStyle:  "italic",
            fontSize:   "18px",
            color:      "rgba(10,31,43,0.28)",
            marginBottom: "8px",
          }}>
            Sin documentos registrados
          </div>
          <p style={{ fontSize: "12px", color: "rgba(10,31,43,0.35)", lineHeight: 1.6 }}>
            Si has realizado compras, contacta con nosotros para asociarlas a tu cuenta.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {documents.map((doc) => (
        <div
          key={doc.id}
          style={{
            padding:      "3px",
            borderRadius: "18px",
            background:   "rgba(154,114,48,0.03)",
            border:       "1px solid rgba(154,114,48,0.10)",
          }}
        >
          <div
            style={{
              borderRadius:   "15px",
              background:     "#FFFFFF",
              boxShadow:      "inset 0 1px 0 rgba(255,255,255,0.90)",
              padding:        "16px 24px",
              display:        "flex",
              justifyContent: "space-between",
              alignItems:     "center",
              flexWrap:       "wrap",
              gap:            "12px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <div style={{
                fontFamily:    "monospace",
                fontSize:      "9px",
                textTransform: "uppercase",
                letterSpacing: "0.22em",
                color:         "rgba(10,31,43,0.30)",
              }}>
                {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
              </div>
              <div style={{
                fontFamily:    "var(--font-catalog-serif, Georgia, serif)",
                fontWeight:    400,
                fontSize:      "15px",
                color:         "#0a1f2b",
              }}>
                {doc.code ?? "—"}
              </div>
              <div style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(10,31,43,0.30)" }}>
                {formatDate(doc.issue_date)}
              </div>
            </div>

            <div style={{
              display:       "flex",
              flexDirection: "column",
              alignItems:    "flex-end",
              gap:           "8px",
            }}>
              <StatusBadge map={DOCUMENT_STATUS} status={doc.status} />
              <span style={{
                fontFamily:    "var(--font-catalog-serif, Georgia, serif)",
                fontSize:      "17px",
                fontWeight:    400,
                color:         "#0a1f2b",
              }}>
                {doc.total != null ? formatCurrency(doc.total) : "—"}
              </span>
              <DownloadInvoiceButton documentId={doc.id} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
