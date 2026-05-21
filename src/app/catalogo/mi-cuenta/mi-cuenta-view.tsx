"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";

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

// ── Status badge helpers ──────────────────────────────────────────────────────

const RESERVATION_STATUS: Record<
  string,
  { label: string; bg: string; color: string; border: string }
> = {
  pendiente: {
    label: "Pendiente",
    bg: "rgba(200,138,0,0.1)",
    color: "#b37900",
    border: "rgba(200,138,0,0.3)",
  },
  confirmada: {
    label: "Confirmada",
    bg: "rgba(10,55,70,0.1)",
    color: "#0a3746",
    border: "rgba(10,55,70,0.3)",
  },
  entregada: {
    label: "Entregada",
    bg: "rgba(22,120,80,0.1)",
    color: "#167850",
    border: "rgba(22,120,80,0.3)",
  },
  cancelada: {
    label: "Cancelada",
    bg: "rgba(180,30,30,0.08)",
    color: "#b41e1e",
    border: "rgba(180,30,30,0.25)",
  },
};

const DOCUMENT_STATUS: Record<
  string,
  { label: string; bg: string; color: string; border: string }
> = {
  borrador: {
    label: "Borrador",
    bg: "rgba(120,120,120,0.1)",
    color: "#666",
    border: "rgba(120,120,120,0.25)",
  },
  emitido: {
    label: "Emitido",
    bg: "rgba(10,55,70,0.1)",
    color: "#0a3746",
    border: "rgba(10,55,70,0.3)",
  },
  pagado: {
    label: "Pagado",
    bg: "rgba(22,120,80,0.1)",
    color: "#167850",
    border: "rgba(22,120,80,0.3)",
  },
  vencido: {
    label: "Vencido",
    bg: "rgba(200,80,0,0.1)",
    color: "#c85000",
    border: "rgba(200,80,0,0.3)",
  },
  cancelado: {
    label: "Cancelado",
    bg: "rgba(180,30,30,0.08)",
    color: "#b41e1e",
    border: "rgba(180,30,30,0.25)",
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
    label: status,
    bg: "rgba(120,120,120,0.1)",
    color: "#666",
    border: "rgba(120,120,120,0.25)",
  };
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        padding: "2px 8px",
        fontFamily: "monospace",
        fontSize: "9px",
        textTransform: "uppercase",
        letterSpacing: "0.18em",
        borderRadius: 0,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

const DOC_TYPE_LABELS: Record<string, string> = {
  factura: "Factura",
  factura_rectificativa: "Factura rectificativa",
  albaran: "Albarán",
  presupuesto: "Presupuesto",
  nota_cargo: "Nota de cargo",
};

// ── Main component ────────────────────────────────────────────────────────────

export function MiCuentaView({
  user,
  isWholesale,
  reservations,
  documents,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("datos");

  const tabs: { id: Tab; label: string }[] = [
    { id: "datos", label: "Mis datos" },
    { id: "reservas", label: "Mis reservas" },
    { id: "historico", label: "Mi histórico" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f5f1ea" }}>
      {/* ── Dark header ─────────────────────────────────────────────────── */}
      <header
        style={{
          background: "linear-gradient(160deg, #041c28 0%, #0a3746 100%)",
          padding: "48px 24px 40px",
        }}
      >
        <div style={{ maxWidth: "768px", margin: "0 auto" }}>
          {/* Back link */}
          <Link
            href="/catalogo"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontFamily: "monospace",
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              color: "rgba(255,255,255,0.4)",
              textDecoration: "none",
              marginBottom: "24px",
              transition: "color 0.15s",
            }}
          >
            ← Volver al catálogo
          </Link>

          {/* Eyebrow */}
          <div
            style={{
              fontFamily: "monospace",
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.4em",
              color: "#c8a164",
              marginBottom: "10px",
            }}
          >
            Mi cuenta
          </div>

          {/* Name */}
          <h1
            style={{
              fontWeight: 300,
              fontSize: "30px",
              color: "#fff",
              margin: "0 0 6px",
              lineHeight: 1.15,
            }}
          >
            {user.name}
          </h1>

          {/* Email */}
          <div
            style={{
              fontFamily: "monospace",
              fontSize: "11px",
              color: "rgba(255,255,255,0.4)",
              marginBottom: isWholesale ? "16px" : "0",
            }}
          >
            {user.email}
          </div>

          {/* Wholesale badge */}
          {isWholesale && (
            <span
              style={{
                display: "inline-block",
                marginTop: "12px",
                border: "1px solid rgba(200,161,100,0.5)",
                background: "rgba(200,161,100,0.1)",
                color: "#c8a164",
                fontFamily: "monospace",
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.22em",
                padding: "4px 10px",
              }}
            >
              Precios mayorista
            </span>
          )}
        </div>
      </header>

      {/* ── Tab nav ─────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "rgba(245,241,234,0.95)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(10,37,48,0.08)",
        }}
      >
        <div
          style={{
            maxWidth: "768px",
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            gap: "0",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === tab.id
                    ? "2px solid #c8a164"
                    : "2px solid transparent",
                padding: "14px 20px 12px",
                fontFamily: "monospace",
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.22em",
                color:
                  activeTab === tab.id
                    ? "#0a3746"
                    : "rgba(10,37,48,0.45)",
                cursor: "pointer",
                transition: "color 0.15s, border-color 0.15s",
                whiteSpace: "nowrap",
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
          maxWidth: "768px",
          margin: "0 auto",
          padding: "40px 24px",
        }}
      >
        {activeTab === "datos" && (
          <MisDatos user={user} isWholesale={isWholesale} />
        )}
        {activeTab === "reservas" && (
          <MisReservas reservations={reservations} />
        )}
        {activeTab === "historico" && (
          <MiHistorico documents={documents} />
        )}
      </div>
    </div>
  );
}

// ── Mis datos ─────────────────────────────────────────────────────────────────

function MisDatos({
  user,
  isWholesale,
}: {
  user: { email: string; name: string };
  isWholesale: boolean;
}) {
  const fields = [
    { label: "Nombre", value: user.name },
    { label: "Email", value: user.email },
    { label: "Tipo de cuenta", value: isWholesale ? "Mayorista" : "Minorista" },
  ];

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(10,37,48,0.1)",
        padding: "32px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {fields.map((f) => (
          <div key={f.label}>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.28em",
                color: "rgba(10,37,48,0.4)",
                marginBottom: "6px",
              }}
            >
              {f.label}
            </div>
            <div
              style={{
                fontSize: "15px",
                color: "#0a3746",
              }}
            >
              {f.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mis reservas ──────────────────────────────────────────────────────────────

function MisReservas({
  reservations,
}: {
  reservations: Props["reservations"];
}) {
  if (reservations.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "64px 0",
          fontFamily: "monospace",
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.3em",
          color: "rgba(10,37,48,0.3)",
        }}
      >
        Aún no tienes reservas
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {reservations.map((r) => (
        <div
          key={r.id}
          style={{
            background: "#fff",
            border: "1px solid rgba(10,37,48,0.1)",
            padding: "20px 24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "15px",
                  color: "#0a3746",
                  marginBottom: "2px",
                }}
              >
                {r.product_name}
              </div>
              {r.product_sku && (
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: "9px",
                    color: "rgba(10,37,48,0.35)",
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                  }}
                >
                  {r.product_sku}
                </div>
              )}
            </div>
            <StatusBadge map={RESERVATION_STATUS} status={r.status} />
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "13px",
                color: "#0a3746",
              }}
            >
              {r.quantity} × {formatCurrency(r.price_snapshot)}
            </span>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "10px",
                color: "rgba(10,37,48,0.35)",
              }}
            >
              {formatDate(r.created_at)}
            </span>
          </div>

          {(r.phone || r.note) && (
            <div
              style={{
                marginTop: "12px",
                paddingTop: "12px",
                borderTop: "1px solid rgba(10,37,48,0.06)",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              {r.phone && (
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: "10px",
                    color: "rgba(10,37,48,0.4)",
                  }}
                >
                  Tel: {r.phone}
                </span>
              )}
              {r.note && (
                <span
                  style={{
                    fontSize: "12px",
                    color: "rgba(10,37,48,0.45)",
                    fontStyle: "italic",
                  }}
                >
                  {r.note}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Mi histórico ──────────────────────────────────────────────────────────────

function MiHistorico({ documents }: { documents: Props["documents"] }) {
  if (documents.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "64px 24px",
        }}
      >
        <div
          style={{
            fontFamily: "monospace",
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.3em",
            color: "rgba(10,37,48,0.3)",
            marginBottom: "12px",
          }}
        >
          No hay facturas registradas a tu nombre
        </div>
        <div
          style={{
            fontSize: "13px",
            color: "rgba(10,37,48,0.4)",
          }}
        >
          Si has realizado compras, contacta con nosotros.
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
            background: "#fff",
            border: "1px solid rgba(10,37,48,0.1)",
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.22em",
                color: "rgba(10,37,48,0.4)",
              }}
            >
              {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
            </div>
            <div
              style={{
                fontWeight: 600,
                fontSize: "14px",
                color: "#0a3746",
              }}
            >
              {doc.code ?? "—"}
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "10px",
                color: "rgba(10,37,48,0.35)",
              }}
            >
              {formatDate(doc.issue_date)}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "6px",
            }}
          >
            <StatusBadge map={DOCUMENT_STATUS} status={doc.status} />
            <span
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "#0a3746",
              }}
            >
              {doc.total != null ? formatCurrency(doc.total) : "—"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
