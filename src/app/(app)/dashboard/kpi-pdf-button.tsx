"use client";

import { useState } from "react";
import { Download, CalendarRange, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { fetchKpiReport, type KpiReportData } from "./kpi-actions";

// ── Brand palette ────────────────────────────────────────────────────────────
const C = {
  primary: "#0a3746",
  primaryDeep: "#062632",
  gold: "#b88a3d",
  goldLight: "#d4ae6e",
  cream: "#f6f2ea",
  surface: "#fbf8f1",
  border: "#e3dccb",
  muted: "#5b6e76",
  dim: "#8a9aa0",
  success: "#3e8160",
  danger: "#b14338",
  white: "#ffffff",
};

function eur(n: number, dec = 2) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(n);
}

function pct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function isoMonthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ── PDF generation ───────────────────────────────────────────────────────────
async function generatePdf(data: KpiReportData) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const ML = 16;
  const MR = W - ML;

  // ── Helpers ────────────────────────────────────────────────────────────────
  let y = 0;

  function newPageIfNeeded(needed = 30) {
    if (y + needed > H - 18) {
      addFooter();
      doc.addPage();
      y = 22;
    }
  }

  function sectionDivider(eyebrow: string, title: string) {
    newPageIfNeeded(24);
    // Gold line
    doc.setFillColor(C.gold);
    doc.rect(ML, y, 14, 0.4, "F");
    y += 2.5;
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C.gold);
    doc.text(eyebrow.toUpperCase(), ML, y);
    y += 4;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C.primary);
    doc.text(title, ML, y);
    y += 6;
  }

  function hairline(gap = 5) {
    doc.setDrawColor(C.border);
    doc.setLineWidth(0.25);
    doc.line(ML, y, MR, y);
    y += gap;
  }

  function kpiBox(
    x: number,
    bY: number,
    w: number,
    h: number,
    label: string,
    value: string,
    sub: string,
    accent?: string
  ) {
    doc.setFillColor(C.cream);
    doc.rect(x, bY, w, h, "F");
    doc.setDrawColor(C.border);
    doc.setLineWidth(0.25);
    doc.rect(x, bY, w, h, "S");
    // top gold line
    doc.setFillColor(accent ?? C.gold);
    doc.rect(x, bY, 10, 0.5, "F");

    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(accent ?? C.gold);
    doc.text(label.toUpperCase(), x + 3, bY + 4.5);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C.primary);
    doc.text(value, x + 3, bY + 11);

    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C.muted);
    doc.text(sub, x + 3, bY + 15.5);
  }

  function addFooter() {
    const pg = doc.getNumberOfPages();
    doc.setPage(pg);
    doc.setFillColor(C.primary);
    doc.rect(0, H - 9, W, 9, "F");
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C.goldLight);
    doc.text(
      `Lingot · Informe de gestión · ${fmtDate(data.from)} – ${fmtDate(data.to)}`,
      ML,
      H - 4
    );
    doc.setTextColor(C.white);
    doc.text(`${pg}`, MR, H - 4, { align: "right" });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PORTADA
  // ════════════════════════════════════════════════════════════════════════════
  doc.setFillColor(C.primary);
  doc.rect(0, 0, W, 52, "F");

  // Gold accent bottom of header
  doc.setFillColor(C.gold);
  doc.rect(0, 51.5, W, 0.5, "F");

  // Vertical gold rule left
  doc.setFillColor(C.gold);
  doc.rect(ML, 14, 0.5, 24, "F");

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(C.white);
  doc.text("LINGOT", ML + 5, 26);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(C.goldLight);
  doc.text("INFORME DE GESTIÓN · Te Quiero Group", ML + 5, 33);

  doc.setFontSize(7);
  doc.setTextColor(C.white);
  doc.text(
    `Período: ${fmtDate(data.from)} — ${fmtDate(data.to)}`,
    ML + 5,
    40
  );

  // Generated date top-right
  doc.setFontSize(6.5);
  doc.setTextColor(C.dim);
  doc.text(
    `Generado: ${new Date(data.generatedAt).toLocaleString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    MR,
    10,
    { align: "right" }
  );

  y = 62;

  // ── RESUMEN EJECUTIVO (4 KPI boxes) ─────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(C.primary);
  doc.text("RESUMEN EJECUTIVO", ML, y);
  y += 4;

  const bW = (MR - ML) / 4 - 2;
  const bH = 20;
  kpiBox(ML, y, bW, bH, "Total facturado", eur(data.libroTotal, 0), `${data.libroFacturas} facturas`);
  kpiBox(ML + bW + 2.7, y, bW, bH, "Beneficio neto", eur(data.totalProfit, 0), `Margen ${data.margenGlobal.toFixed(1)}%`, data.totalProfit >= 0 ? C.success : C.danger);
  kpiBox(ML + (bW + 2.7) * 2, y, bW, bH, "Almacén coste", eur(data.stockValorTotal, 0), `${data.stockRows.length} referencias`);
  kpiBox(ML + (bW + 2.7) * 3, y, bW, bH, "Almacén PVP", eur(data.stockPrecioTotal, 0), "a precio de venta");
  y += bH + 8;

  // Cotización spots
  const sW = (MR - ML) / 2 - 2;
  doc.setFillColor(C.primaryDeep);
  doc.rect(ML, y, sW, 14, "F");
  doc.setFillColor(C.primaryDeep);
  doc.rect(ML + sW + 4, y, sW, 14, "F");

  [
    { label: "Oro · 24k  XAU/EUR", price: data.spotOro },
    { label: "Plata · .999  XAG/EUR", price: data.spotPlata },
  ].forEach((m, i) => {
    const sx = ML + i * (sW + 4);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C.goldLight);
    doc.text(m.label.toUpperCase(), sx + 4, y + 5);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C.white);
    doc.text(
      m.price != null ? `${m.price.toFixed(2)} €/g` : "Sin dato",
      sx + 4,
      y + 12
    );
  });

  y += 22;
  hairline();

  // ════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 01 · LIBRO DE FACTURACIÓN
  // ════════════════════════════════════════════════════════════════════════════
  sectionDivider("01", "Libro de facturación");

  // 5 summary boxes
  const lW = (MR - ML) / 5 - 1.5;
  const lH = 18;
  const libroBoxes = [
    { label: "Base imponible", value: eur(data.libroBase, 0), sub: "sin IGIC" },
    { label: "IGIC total", value: eur(data.libroIgic, 0), sub: "impuesto devengado" },
    { label: "Total facturado", value: eur(data.libroTotal, 0), sub: "con IGIC" },
    { label: "Cobrado", value: eur(data.liboPagado, 0), sub: "facturas pagadas", accent: C.success },
    { label: "Pendiente", value: eur(data.libroPendiente, 0), sub: "por cobrar", accent: data.libroPendiente > 0 ? C.danger : C.muted },
  ];
  libroBoxes.forEach((b, i) => {
    kpiBox(ML + i * (lW + 1.9), y, lW, lH, b.label, b.value, b.sub, (b as {accent?: string}).accent);
  });
  y += lH + 8;

  // Totals row
  const albaranesTotal = data.libroAlbaranes;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(C.muted);
  doc.text(
    `${data.libroFacturas} facturas emitidas · ${albaranesTotal} albaranes · Período: ${fmtDate(data.from)} – ${fmtDate(data.to)}`,
    ML,
    y
  );
  y += 8;
  hairline();

  // ════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 02 · RENTABILIDAD POR VENTA
  // ════════════════════════════════════════════════════════════════════════════
  sectionDivider("02", "Rentabilidad por venta");

  if (data.ventas.length === 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C.dim);
    doc.text("Sin ventas en el período seleccionado.", ML, y);
    y += 10;
  } else {
    // Summary row
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C.muted);
    doc.text(
      `Ingresos: ${eur(data.totalRevenue)}   ·   Costes: ${eur(data.totalCost)}   ·   Beneficio: ${eur(data.totalProfit)}   ·   Margen global: ${data.margenGlobal.toFixed(1)}%`,
      ML,
      y
    );
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [["Fecha", "Factura", "Cliente", "Producto", "Cant.", "PVP/u", "Coste/u", "Beneficio", "Margen"]],
      body: data.ventas.map((v) => [
        fmtDate(v.fecha),
        v.esRectificacion ? `${v.factura} ®` : v.factura,
        v.cliente.length > 18 ? v.cliente.slice(0, 16) + "…" : v.cliente,
        (v.producto.length > 20 ? v.producto.slice(0, 18) + "…" : v.producto) + (v.sku ? ` · ${v.sku}` : ""),
        String(v.cantidad),
        eur(v.pvpUnit),
        eur(v.costeUnit),
        (v.beneficioUnit >= 0 ? "+" : "") + eur(v.beneficioUnit),
        pct(v.margenPct),
      ]),
      foot: [[
        "", "", "", "TOTAL",
        "",
        eur(data.totalRevenue),
        eur(data.totalCost),
        (data.totalProfit >= 0 ? "+" : "") + eur(data.totalProfit),
        `${data.margenGlobal.toFixed(1)}%`,
      ]],
      theme: "plain",
      styles: {
        fontSize: 6.5,
        cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
        textColor: C.primary,
        font: "helvetica",
        overflow: "ellipsize",
      },
      headStyles: {
        fillColor: C.primary,
        textColor: C.white,
        fontStyle: "bold",
        fontSize: 6,
      },
      footStyles: {
        fillColor: C.cream,
        textColor: C.primary,
        fontStyle: "bold",
        fontSize: 6.5,
        lineWidth: { top: 0.4 },
        lineColor: C.gold,
      },
      alternateRowStyles: { fillColor: "#faf8f3" },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 20 },
        2: { cellWidth: 24 },
        3: { cellWidth: "auto" },
        4: { halign: "right", cellWidth: 10 },
        5: { halign: "right", cellWidth: 20 },
        6: { halign: "right", cellWidth: 20 },
        7: { halign: "right", cellWidth: 16 },
        8: { halign: "right", cellWidth: 20 },
        9: { halign: "right", cellWidth: 16 },
      },
      margin: { left: ML, right: ML },
      didParseCell: (hookData) => {
        if (hookData.section === "body" && hookData.column.index === 8) {
          const txt = hookData.cell.text[0] ?? "";
          hookData.cell.styles.textColor = txt.startsWith("+") ? C.success : C.danger;
        }
        if (hookData.section === "body" && hookData.column.index === 9) {
          const val = data.ventas[hookData.row.index]?.margenPct ?? 0;
          hookData.cell.styles.textColor = val >= 0 ? C.success : C.danger;
        }
      },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SECCIÓN 03 · ALMACÉN
  // ════════════════════════════════════════════════════════════════════════════
  newPageIfNeeded(40);
  sectionDivider("03", "Almacén · snapshot actual");

  // Almacén summary boxes
  const aW = (MR - ML) / 3 - 2;
  kpiBox(ML, y, aW, 18, "Valor a coste", eur(data.stockValorTotal, 0), "coste real de lotes");
  kpiBox(ML + aW + 3, y, aW, 18, "Valor a PVP", eur(data.stockPrecioTotal, 0), "a precio de venta actual");
  kpiBox(ML + (aW + 3) * 2, y, aW, 18, "Potencial", eur(data.stockPrecioTotal - data.stockValorTotal, 0), "margen latente en stock");
  y += 26;

  autoTable(doc, {
    startY: y,
    head: [["Producto", "SKU", "Metal", "Stock", "Mín.", "Coste/u", "Valor coste", "PVP/u", "Alerta"]],
    body: data.stockRows.map((r) => {
      const purityLabel =
        r.metal === "oro"
          ? r.purity >= 0.999 ? "24k" : r.purity >= 0.75 ? "18k" : r.purity >= 0.585 ? "14k" : `${(r.purity * 1000).toFixed(0)}‰`
          : `${(r.purity * 1000).toFixed(0)}‰`;
      const alerta = r.stockActual <= r.stockMin ? "⚠ Bajo" : "";
      return [
        r.nombre.length > 24 ? r.nombre.slice(0, 22) + "…" : r.nombre,
        r.sku ?? "—",
        `${r.metal === "oro" ? "Oro" : "Plata"} ${purityLabel}`,
        String(r.stockActual),
        String(r.stockMin),
        eur(r.costeUnit),
        eur(r.valorTotal),
        r.precioVenta != null ? eur(r.precioVenta) : "Sin spot",
        alerta,
      ];
    }),
    foot: [[
      "TOTAL", "", "", "", "", "",
      eur(data.stockValorTotal),
      eur(data.stockPrecioTotal),
      "",
    ]],
    theme: "plain",
    styles: {
      fontSize: 7,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      textColor: C.primary,
      font: "helvetica",
    },
    headStyles: {
      fillColor: C.primary,
      textColor: C.white,
      fontStyle: "bold",
      fontSize: 6.5,
    },
    footStyles: {
      fillColor: C.cream,
      textColor: C.primary,
      fontStyle: "bold",
      fontSize: 7,
      lineWidth: { top: 0.4 },
      lineColor: C.gold,
    },
    alternateRowStyles: { fillColor: "#faf8f3" },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 18 },
      2: { cellWidth: 22 },
      3: { halign: "right", cellWidth: 12 },
      4: { halign: "right", cellWidth: 10 },
      5: { halign: "right", cellWidth: 20 },
      6: { halign: "right", cellWidth: 22 },
      7: { halign: "right", cellWidth: 22 },
      8: { halign: "center", cellWidth: 14 },
    },
    margin: { left: ML, right: ML },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.column.index === 8) {
        if (hookData.cell.text[0] === "⚠ Bajo") {
          hookData.cell.styles.textColor = C.danger;
          hookData.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  // ── Footer on all pages ──────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFillColor(C.primary);
    doc.rect(0, H - 9, W, 9, "F");
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C.goldLight);
    doc.text(
      `Lingot · Informe de gestión · ${fmtDate(data.from)} – ${fmtDate(data.to)}`,
      ML,
      H - 4
    );
    doc.setTextColor(C.white);
    doc.text(`${p} / ${pageCount}`, MR, H - 4, { align: "right" });
  }

  const fileName = `lingot-informe-${data.from}-${data.to}.pdf`;
  doc.save(fileName);
}

// ── UI Component ─────────────────────────────────────────────────────────────
export function KpiPdfButton() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(() => isoMonthStart());
  const [to, setTo] = useState(() => isoToday());
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    if (!from || !to || from > to) {
      toast({ variant: "error", title: "Rango de fechas no válido" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await fetchKpiReport(from, to);
      if (error || !data) {
        toast({ variant: "error", title: "Error al generar el informe", description: error });
        return;
      }
      await generatePdf(data);
      setOpen(false);
      toast({ variant: "success", title: "Informe descargado" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-0">
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen((v) => !v)}
      >
        <Download className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
        Exportar informe
        <CalendarRange className="ml-2 h-3.5 w-3.5 opacity-60" strokeWidth={1.5} />
      </Button>

      {open && (
        <div className="mt-3 w-80 border border-border bg-surface-raised shadow-vault">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <CalendarRange className="h-3.5 w-3.5 text-gold-deep" strokeWidth={1.5} />
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
                Período del informe
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-text-dim transition-colors hover:text-primary"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Quick presets */}
            <div className="flex gap-2">
              {[
                {
                  label: "Este mes",
                  action: () => { setFrom(isoMonthStart()); setTo(isoToday()); },
                },
                {
                  label: "Año actual",
                  action: () => { setFrom(`${new Date().getFullYear()}-01-01`); setTo(isoToday()); },
                },
                {
                  label: "Todo",
                  action: () => { setFrom("2020-01-01"); setTo(isoToday()); },
                },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={p.action}
                  className="flex-1 border border-border bg-surface px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-text-muted transition-colors hover:border-gold/60 hover:text-primary"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Date inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.22em] text-text-dim">
                  Desde
                </label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="block w-full border border-border bg-surface px-3 py-2 font-mono text-[12px] text-primary focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.22em] text-text-dim">
                  Hasta
                </label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="block w-full border border-border bg-surface px-3 py-2 font-mono text-[12px] text-primary focus:border-gold focus:outline-none"
                />
              </div>
            </div>

            {from && to && (
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-dim">
                {from} → {to}
              </p>
            )}

            <Button
              type="button"
              className="w-full"
              loading={loading}
              onClick={handleGenerate}
            >
              <Download className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
              Generar PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
