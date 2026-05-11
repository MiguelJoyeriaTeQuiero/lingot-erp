"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface KpiData {
  monthRevenue: number;
  monthName: string;
  monthOpCount: number;
  issuedCount: number;
  activeClients: number;
  totalClients: number;
  stockValue: number;
  productCount: number;
  spotOro: number | null;
  spotOroAt: string | null;
  spotPlata: number | null;
  spotPlataAt: string | null;
  profitRows: { name: string; revenue: number; cost: number }[];
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  marginPct: number;
  recent: {
    code: string | null;
    doc_type: string;
    clientName: string;
    status: string;
    total: number;
    issue_date: string;
  }[];
  generatedAt: string;
}

const PRIMARY = "#0a3746";
const GOLD = "#b88a3d";
const GOLD_LIGHT = "#d4ae6e";
const CREAM = "#f6f2ea";
const BORDER = "#e3dccb";
const MUTED = "#5b6e76";
const DIM = "#8a9aa0";

function eur(n: number, decimals = 2) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function KpiPdfButton({ data }: { data: KpiData }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      const ML = 18;
      const MR = W - ML;
      let y = 0;

      // ── HEADER BAR ─────────────────────────────────────────────────────────
      doc.setFillColor(PRIMARY);
      doc.rect(0, 0, W, 28, "F");

      // Gold bottom line on header
      doc.setDrawColor(GOLD);
      doc.setLineWidth(0.5);
      doc.line(0, 28, W, 28);

      doc.setTextColor("#ffffff");
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text("LINGOT", ML, 12);

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(GOLD_LIGHT);
      doc.text("INFORME KPI · Te Quiero Group", ML, 19);

      // Date top-right
      doc.setTextColor("#ffffff");
      doc.setFontSize(7);
      doc.text(
        `Generado: ${new Date(data.generatedAt).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        MR,
        12,
        { align: "right" }
      );

      y = 38;

      // ── SECTION HELPER ──────────────────────────────────────────────────────
      function sectionHeader(title: string, eyebrow: string) {
        // Gold accent line
        doc.setFillColor(GOLD);
        doc.rect(ML, y, 18, 0.5, "F");
        y += 3;

        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(GOLD);
        doc.text(eyebrow.toUpperCase(), ML, y);
        y += 4.5;

        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(PRIMARY);
        doc.text(title, ML, y);
        y += 7;
      }

      function hairline() {
        doc.setDrawColor(BORDER);
        doc.setLineWidth(0.3);
        doc.line(ML, y, MR, y);
        y += 5;
      }

      // ── 01 · FACTURACIÓN DEL MES ────────────────────────────────────────────
      sectionHeader(`Facturación · ${data.monthName}`, "01");

      // Big revenue number
      const euros = Math.floor(data.monthRevenue).toLocaleString("es-ES");
      const cents = data.monthRevenue.toFixed(2).split(".")[1] ?? "00";

      doc.setFontSize(44);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(PRIMARY);
      const numX = ML;
      doc.text(euros, numX, y + 4);

      const numW = doc.getTextWidth(euros);
      doc.setFontSize(20);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(GOLD);
      doc.text(`,${cents}`, numX + numW + 0.5, y + 4);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(DIM);
      doc.text("EUR", numX + numW + doc.getTextWidth(`,${cents}`) + 2, y + 1);

      // Operation count on the right
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(PRIMARY);
      doc.text(String(data.monthOpCount).padStart(2, "0"), MR, y + 1, { align: "right" });
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(MUTED);
      doc.text("operaciones", MR, y + 6, { align: "right" });

      y += 18;
      hairline();

      // ── 02 · INDICADORES ────────────────────────────────────────────────────
      sectionHeader("Indicadores", "02");

      const kpiCards = [
        { label: "Documentos emitidos", value: String(data.issuedCount).padStart(2, "0"), sub: "albaranes y facturas" },
        { label: "Clientes activos", value: String(data.activeClients).padStart(2, "0"), sub: `de ${data.totalClients} totales` },
        { label: "Almacén valorado", value: eur(data.stockValue, 0), sub: `${data.productCount} referencias` },
      ];

      const cardW = (MR - ML) / 3 - 3;
      kpiCards.forEach((card, i) => {
        const cx = ML + i * (cardW + 4.5);

        doc.setFillColor(CREAM);
        doc.rect(cx, y, cardW, 20, "F");
        doc.setDrawColor(BORDER);
        doc.setLineWidth(0.3);
        doc.rect(cx, y, cardW, 20, "S");

        // Gold top line
        doc.setFillColor(GOLD);
        doc.rect(cx, y, 8, 0.6, "F");

        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(GOLD);
        doc.text(card.label.toUpperCase(), cx + 3, y + 4.5);

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(PRIMARY);
        doc.text(card.value, cx + 3, y + 13);

        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(MUTED);
        doc.text(card.sub, cx + 3, y + 18);
      });

      y += 28;
      hairline();

      // ── 03 · COTIZACIÓN DEL METAL ───────────────────────────────────────────
      sectionHeader("Cotización del metal", "03");

      const metals = [
        {
          label: "Oro · 24k",
          symbol: "XAU",
          price: data.spotOro,
          at: data.spotOroAt,
        },
        {
          label: "Plata · .999",
          symbol: "XAG",
          price: data.spotPlata,
          at: data.spotPlataAt,
        },
      ];

      const metalW = (MR - ML) / 2 - 2;
      metals.forEach((m, i) => {
        const mx = ML + i * (metalW + 4);

        doc.setFillColor(PRIMARY);
        doc.rect(mx, y, metalW, 22, "F");

        doc.setFillColor(GOLD);
        doc.rect(mx, y + 22 - 0.6, metalW, 0.6, "F");

        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(GOLD_LIGHT);
        doc.text(m.label.toUpperCase(), mx + 4, y + 5);

        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor("#ffffff");
        doc.text(`${m.symbol} · EUR/g`, mx + 4, y + 9.5);

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor("#ffffff");
        doc.text(m.price != null ? `${m.price.toFixed(2)} €/g` : "—", mx + 4, y + 18);

        if (m.at) {
          doc.setFontSize(6);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(GOLD_LIGHT);
          doc.text(
            new Date(m.at).toLocaleString("es-ES", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
            mx + metalW - 3,
            y + 18,
            { align: "right" }
          );
        }
      });

      y += 30;
      hairline();

      // ── 04 · RENTABILIDAD ───────────────────────────────────────────────────
      if (data.profitRows.length > 0) {
        sectionHeader("Rentabilidad acumulada", "04");

        // Summary row above table
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(MUTED);
        doc.text(
          `Ingresos: ${eur(data.totalRevenue)}   ·   Costes: ${eur(data.totalCost)}   ·   Beneficio: ${eur(data.totalProfit)}   ·   Margen: ${data.marginPct.toFixed(1)}%`,
          ML,
          y
        );
        y += 5;

        autoTable(doc, {
          startY: y,
          head: [["Producto", "Ingresos", "Costes", "Beneficio", "Margen"]],
          body: data.profitRows.map((r) => {
            const profit = r.revenue - r.cost;
            const margin = r.revenue > 0 ? ((profit / r.revenue) * 100).toFixed(1) + "%" : "—";
            return [
              r.name,
              eur(r.revenue),
              eur(r.cost),
              (profit >= 0 ? "+" : "") + eur(profit),
              margin,
            ];
          }),
          foot: [[
            "TOTAL",
            eur(data.totalRevenue),
            eur(data.totalCost),
            (data.totalProfit >= 0 ? "+" : "") + eur(data.totalProfit),
            data.marginPct.toFixed(1) + "%",
          ]],
          theme: "plain",
          styles: {
            fontSize: 8,
            cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
            textColor: PRIMARY,
            font: "helvetica",
          },
          headStyles: {
            fillColor: PRIMARY,
            textColor: "#ffffff",
            fontStyle: "bold",
            fontSize: 7,
          },
          footStyles: {
            fillColor: CREAM,
            textColor: PRIMARY,
            fontStyle: "bold",
            fontSize: 7.5,
            lineWidth: { top: 0.4 },
            lineColor: GOLD,
          },
          alternateRowStyles: { fillColor: "#faf8f3" },
          columnStyles: {
            0: { cellWidth: "auto" },
            1: { halign: "right" },
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
          },
          margin: { left: ML, right: ML },
          didDrawCell: (hookData) => {
            // Color profit column green/red
            if (hookData.section === "body" && hookData.column.index === 3) {
              const txt = hookData.cell.text[0] ?? "";
              const isPos = txt.startsWith("+") || (!txt.startsWith("-") && txt !== "—");
              doc.setTextColor(isPos ? "#3e8160" : "#b14338");
            }
          },
        });

        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
        hairline();
      }

      // ── 05 · OPERACIONES RECIENTES ──────────────────────────────────────────
      if (data.recent.length > 0) {
        // Check if we need a new page
        if (y > 220) {
          doc.addPage();
          y = 20;
        }

        sectionHeader("Operaciones recientes", "05");

        autoTable(doc, {
          startY: y,
          head: [["Código", "Tipo", "Cliente", "Estado", "Total", "Fecha"]],
          body: data.recent.map((r) => [
            r.code ?? "—",
            r.doc_type.toUpperCase(),
            r.clientName,
            r.status.toUpperCase(),
            eur(r.total),
            shortDate(r.issue_date),
          ]),
          theme: "plain",
          styles: {
            fontSize: 7.5,
            cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
            textColor: PRIMARY,
            font: "helvetica",
          },
          headStyles: {
            fillColor: PRIMARY,
            textColor: "#ffffff",
            fontStyle: "bold",
            fontSize: 7,
          },
          alternateRowStyles: { fillColor: "#faf8f3" },
          columnStyles: {
            4: { halign: "right" },
            5: { halign: "right" },
          },
          margin: { left: ML, right: ML },
        });

        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
      }

      // ── FOOTER ──────────────────────────────────────────────────────────────
      const pageCount = doc.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        const pageH = doc.internal.pageSize.getHeight();

        doc.setFillColor(PRIMARY);
        doc.rect(0, pageH - 10, W, 10, "F");

        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(GOLD_LIGHT);
        doc.text("Lingot · Te Quiero Group · Informe KPI", ML, pageH - 4);

        doc.setTextColor("#ffffff");
        doc.text(`${p} / ${pageCount}`, MR, pageH - 4, { align: "right" });
      }

      const fileName = `lingot-kpi-${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      loading={loading}
      onClick={handleDownload}
    >
      <Download className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
      Exportar KPI
    </Button>
  );
}
