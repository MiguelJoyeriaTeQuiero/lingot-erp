import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type {
  ClientRow,
  CompanySettingsRow,
  DocumentLineRow,
  DocumentRow,
} from "@/lib/supabase/typed";

const C_PRIMARY: [number, number, number] = [10, 55, 70];   // #0a3746
const C_GOLD:    [number, number, number] = [200, 161, 100]; // #c8a164
const C_TEXT:    [number, number, number] = [30, 30, 30];
const C_MUTED:   [number, number, number] = [110, 110, 110];
const C_LINE:    [number, number, number] = [210, 210, 210];
const C_WHITE:   [number, number, number] = [255, 255, 255];

const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function fmtMoney(n: number | null | undefined) {
  return eur.format(Number(n ?? 0));
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return format(date, "dd/MM/yyyy");
}

function compact(parts: Array<string | null | undefined>): string {
  return parts.filter((p) => p?.trim()).join("\n");
}

export interface DocumentPdfPayload {
  document: DocumentRow;
  lines: DocumentLineRow[];
  client: ClientRow;
  company: CompanySettingsRow | null;
}

export function generateDocumentPdf(payload: DocumentPdfPayload): jsPDF {
  const { document: doc, lines, client, company } = payload;
  const isFactura = doc.doc_type === "factura";

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const ml = 14;
  const mr = 14;
  const cw = W - ml - mr; // 182 mm

  // ── WORDMARK ──────────────────────────────────────────────────────────────
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(30);
  pdf.setTextColor(...C_PRIMARY);
  pdf.text(company?.trade_name ?? "LINGOT", W / 2, 19, { align: "center" });

  // Gold accent line
  pdf.setDrawColor(...C_GOLD);
  pdf.setLineWidth(0.6);
  pdf.line(ml, 24, W - mr, 24);

  // ── PROVEEDOR / CLIENTE ───────────────────────────────────────────────────
  const colW = (cw - 6) / 2; // ~88 mm each
  const lx = ml;
  const rx = ml + colW + 6;
  const bandH = 8;
  const boxTop = 28;

  // Blue header bands
  pdf.setFillColor(...C_PRIMARY);
  pdf.rect(lx, boxTop, colW, bandH, "F");
  pdf.rect(rx, boxTop, colW, bandH, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...C_WHITE);
  pdf.text("PROVEEDOR", lx + colW / 2, boxTop + 5.2, { align: "center" });
  pdf.text("CLIENTE",   rx + colW / 2, boxTop + 5.2, { align: "center" });

  // Proveedor data
  let provY = boxTop + bandH + 5;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...C_TEXT);
  pdf.text(
    (company?.legal_name ?? company?.trade_name ?? "—").toUpperCase(),
    lx, provY, { maxWidth: colW }
  );
  provY += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...C_MUTED);
  const provBlock = compact([
    company?.tax_id ? `C.I.F.: ${company.tax_id}` : null,
    company?.address,
    [company?.postal_code, company?.city].filter(Boolean).join(" "),
    company?.phone ? `Tfno: ${company.phone}` : null,
    company?.email,
  ]);
  if (provBlock) {
    pdf.text(provBlock, lx, provY, { maxWidth: colW });
    provY += provBlock.split("\n").length * 4 + 2;
  }

  // Cliente data
  let cliY = boxTop + bandH + 5;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...C_TEXT);
  pdf.text(client.name.toUpperCase(), rx, cliY, { maxWidth: colW });
  cliY += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...C_MUTED);
  const cliBlock = compact([
    client.tax_id
      ? `${client.type === "empresa" ? "CIF" : "NIE"}: ${client.tax_id}`
      : null,
    client.contact_name,
    client.address,
    client.postal_code ?? null,
    client.city?.toUpperCase() ?? null,
    client.phone ? `Tfno.: ${client.phone}` : null,
  ]);
  if (cliBlock) {
    pdf.text(cliBlock, rx, cliY, { maxWidth: colW });
  }

  // Light border around both columns
  pdf.setDrawColor(...C_LINE);
  pdf.setLineWidth(0.2);
  pdf.rect(lx, boxTop, colW, Math.max(provY, cliY + cliBlock.split("\n").length * 4) - boxTop + 4);
  pdf.rect(rx, boxTop, colW, Math.max(provY, cliY + cliBlock.split("\n").length * 4) - boxTop + 4);

  // ── Nº FACTURA / FECHA ────────────────────────────────────────────────────
  let y = Math.max(provY + 2, 72);
  const nbxTop = y;
  const col1 = 32;
  const col2 = 42;
  const rH = 7;

  // Row 1
  pdf.setFillColor(...C_PRIMARY);
  pdf.rect(lx, nbxTop, col1, rH, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...C_WHITE);
  pdf.text("Nº Factura", lx + 2, nbxTop + 4.8);

  pdf.setFillColor(...C_WHITE);
  pdf.setDrawColor(...C_LINE);
  pdf.setLineWidth(0.2);
  pdf.rect(lx + col1, nbxTop, col2, rH);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...C_PRIMARY);
  pdf.text(doc.code ?? "(borrador)", lx + col1 + 3, nbxTop + 4.8);

  // Row 2
  pdf.setFillColor(...C_PRIMARY);
  pdf.rect(lx, nbxTop + rH, col1, rH, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...C_WHITE);
  pdf.text("Fecha:", lx + 2, nbxTop + rH + 4.8);

  pdf.setFillColor(...C_WHITE);
  pdf.setDrawColor(...C_LINE);
  pdf.rect(lx + col1, nbxTop + rH, col2, rH);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...C_TEXT);
  pdf.text(fmtDate(doc.issue_date), lx + col1 + 3, nbxTop + rH + 4.8);

  y = nbxTop + rH * 2 + 8;

  // ── LINE ITEMS TABLE ──────────────────────────────────────────────────────
  const hasIgic = lines.some((l) => Number(l.igic_rate) > 0);

  const head = hasIgic
    ? [["CONCEPTO", "UNIDADES", "PRECIO UNIDAD", "IGIC", "IMPORTE"]]
    : [["CONCEPTO", "UNIDADES", "PRECIO UNIDAD", "IMPORTE"]];

  const body = lines.map((l) => {
    const row = [l.description, Number(l.quantity).toString(), fmtMoney(l.unit_price)];
    if (hasIgic) row.push(`${Number(l.igic_rate)}%`);
    row.push(fmtMoney(l.line_total));
    return row;
  });

  autoTable(pdf, {
    head,
    body,
    startY: y,
    theme: "plain",
    margin: { left: ml, right: mr },
    styles: {
      font: "helvetica",
      fontSize: 9,
      textColor: C_TEXT,
      cellPadding: { top: 3.5, right: 3, bottom: 3.5, left: 3 },
      lineColor: C_LINE,
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: C_PRIMARY,
      textColor: C_WHITE,
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "left",
    },
    columnStyles: hasIgic
      ? {
          0: { cellWidth: "auto" },
          1: { cellWidth: 24, halign: "right" },
          2: { cellWidth: 32, halign: "right" },
          3: { cellWidth: 16, halign: "right" },
          4: { cellWidth: 28, halign: "right" },
        }
      : {
          0: { cellWidth: "auto" },
          1: { cellWidth: 24, halign: "right" },
          2: { cellWidth: 32, halign: "right" },
          3: { cellWidth: 28, halign: "right" },
        },
    didDrawPage: (data) => {
      // Número de página en cada hoja
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(...C_MUTED);
      pdf.text(
        `Página ${data.pageNumber}`,
        W - mr,
        H - 8,
        { align: "right" }
      );
    },
  });

  // ── TOTALES ───────────────────────────────────────────────────────────────
  const finalY =
    (pdf as unknown as { lastAutoTable?: { finalY: number } })
      .lastAutoTable?.finalY ?? y + 40;

  let ty = finalY + 6;
  const tLabelX = W - mr - 55;

  if (hasIgic) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...C_MUTED);
    pdf.text("Subtotal:", tLabelX, ty);
    pdf.setTextColor(...C_TEXT);
    pdf.text(fmtMoney(doc.subtotal), W - mr, ty, { align: "right" });
    ty += 5;

    pdf.setTextColor(...C_MUTED);
    pdf.text("IGIC:", tLabelX, ty);
    pdf.setTextColor(...C_TEXT);
    pdf.text(fmtMoney(doc.igic_total), W - mr, ty, { align: "right" });
    ty += 4;

    pdf.setDrawColor(...C_LINE);
    pdf.setLineWidth(0.2);
    pdf.line(tLabelX, ty, W - mr, ty);
    ty += 5;
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(...C_MUTED);
  pdf.text("Total:", tLabelX, ty);
  pdf.setTextColor(...C_PRIMARY);
  pdf.text(fmtMoney(doc.total), W - mr, ty, { align: "right" });

  // ── MÉTODO DE PAGO ────────────────────────────────────────────────────────
  ty += 12;

  pdf.setFillColor(...C_PRIMARY);
  pdf.rect(ml, ty, cw, 8, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...C_WHITE);
  pdf.text("MÉTODO DE PAGO", W / 2, ty + 5.2, { align: "center" });
  ty += 12;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...C_TEXT);
  pdf.text("TRANSFERENCIA BANCARIA", ml, ty);
  ty += 6;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  if (company?.iban) {
    pdf.setTextColor(...C_MUTED);
    pdf.text("Nª cuenta:", ml, ty);
    pdf.setTextColor(...C_TEXT);
    pdf.text(company.iban, ml + 24, ty);
    ty += 5;
  }
  if (doc.due_date) {
    pdf.setTextColor(...C_MUTED);
    const label = doc.status === "pagado" ? "Cobrado el" : "Vence el";
    pdf.text(`${label}:`, ml, ty);
    pdf.setTextColor(...C_TEXT);
    pdf.text(fmtDate(doc.due_date), ml + 24, ty);
    ty += 5;
  }

  // ── EXENCIÓN IGIC ORO DE INVERSIÓN ────────────────────────────────────────
  if (isFactura && lines.some((l) => Number(l.igic_rate) === 0)) {
    ty += 5;
    const exemptText =
      "El oro de inversión está exento de impuestos según el Art.92.1 ley 20/1991, de 7 de junio, de Modificación " +
      "de los aspectos fiscales del Régimen Económico Fiscal de Canarias.";
    const wrapped = pdf.splitTextToSize(exemptText, cw - 10) as string[];
    const boxH = wrapped.length * 4.5 + 7;

    pdf.setDrawColor(...C_LINE);
    pdf.setLineWidth(0.4);
    pdf.rect(ml, ty, cw, boxH);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...C_TEXT);
    pdf.text(wrapped, W / 2, ty + 5, { align: "center" });
    ty += boxH + 4;
  }

  // ── NOTAS DEL DOCUMENTO ───────────────────────────────────────────────────
  if (doc.notes) {
    ty += 4;
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(8);
    pdf.setTextColor(...C_MUTED);
    pdf.text(doc.notes, ml, ty, { maxWidth: cw });
    ty += 8;
  }

  // ── FOOTER PRIVACIDAD ─────────────────────────────────────────────────────
  const privLines = [
    "Información básica. Protección de datos.",
    `Responsable: ${company?.legal_name ?? company?.trade_name ?? ""}`,
    "Finalidad: gestión de la relación contractual y facturación de la misma.",
    "Derechos: usted tiene derecho a acceder, rectificar y suprimir sus datos. Y a otros derechos tal como explica la información adicional " +
      (company?.website ? `que puede encontrar en nuestra política de privacidad en ${company.website}.` : "de nuestra política de privacidad."),
  ];

  const footerY = H - 22;
  pdf.setDrawColor(...C_LINE);
  pdf.setLineWidth(0.2);
  pdf.line(ml, footerY - 3, W - mr, footerY - 3);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(...C_MUTED);
  pdf.text(privLines, ml, footerY, { maxWidth: cw });

  return pdf;
}

export function downloadDocumentPdf(payload: DocumentPdfPayload) {
  const pdf = generateDocumentPdf(payload);
  const filename = `${payload.document.code ?? "documento"}.pdf`.replace(
    /[^\w\-./]/g,
    "_"
  );
  pdf.save(filename);
}
