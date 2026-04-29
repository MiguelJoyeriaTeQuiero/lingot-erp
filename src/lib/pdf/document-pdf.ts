import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type {
  ClientRow,
  CompanySettingsRow,
  DocumentLineRow,
  DocumentRow,
} from "@/lib/supabase/typed";

// Paleta Lingot
const COLOR_PRIMARY: [number, number, number] = [10, 55, 70]; // #0a3746
const COLOR_GOLD: [number, number, number] = [200, 161, 100]; // #c8a164
const COLOR_TEXT: [number, number, number] = [30, 30, 30];
const COLOR_MUTED: [number, number, number] = [110, 110, 110];
const COLOR_LINE: [number, number, number] = [220, 220, 220];

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

function joinLines(parts: Array<string | null | undefined>) {
  return parts.filter((p) => p && p.trim() !== "").join("\n");
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

  const docPdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = docPdf.internal.pageSize.getWidth();
  const pageHeight = docPdf.internal.pageSize.getHeight();
  const marginX = 16;

  // ---------- Header band ----------
  docPdf.setFillColor(...COLOR_PRIMARY);
  docPdf.rect(0, 0, pageWidth, 28, "F");

  docPdf.setTextColor(...COLOR_GOLD);
  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(20);
  docPdf.text(company?.trade_name?.toUpperCase() ?? "LINGOT", marginX, 14);

  docPdf.setTextColor(255, 255, 255);
  docPdf.setFont("helvetica", "normal");
  docPdf.setFontSize(8);
  const companyHeader = joinLines([
    company?.legal_name,
    company?.tax_id ? `CIF: ${company.tax_id}` : null,
    joinLines([company?.address, [company?.postal_code, company?.city].filter(Boolean).join(" ")]),
    [company?.phone, company?.email].filter(Boolean).join(" · "),
  ]);
  if (companyHeader) {
    docPdf.text(companyHeader, marginX, 19, { maxWidth: 110 });
  }

  // Tipo y nº a la derecha
  docPdf.setTextColor(...COLOR_GOLD);
  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(14);
  docPdf.text(
    isFactura ? "FACTURA" : "ALBARÁN",
    pageWidth - marginX,
    13,
    { align: "right" }
  );
  docPdf.setTextColor(255, 255, 255);
  docPdf.setFontSize(10);
  docPdf.text(doc.code ?? "(sin nº)", pageWidth - marginX, 20, {
    align: "right",
  });

  // ---------- Datos cabecera ----------
  let y = 38;
  docPdf.setTextColor(...COLOR_MUTED);
  docPdf.setFont("helvetica", "normal");
  docPdf.setFontSize(8);

  // Bloque cliente (izquierda)
  docPdf.setFont("helvetica", "bold");
  docPdf.text("CLIENTE", marginX, y);
  docPdf.setFont("helvetica", "normal");
  docPdf.setTextColor(...COLOR_TEXT);
  docPdf.setFontSize(10);
  docPdf.text(client.name, marginX, y + 5, { maxWidth: 90 });

  docPdf.setFontSize(9);
  docPdf.setTextColor(...COLOR_MUTED);
  const clientBlock = joinLines([
    client.tax_id ? `${client.type === "empresa" ? "CIF" : "NIF"}: ${client.tax_id}` : null,
    client.contact_name,
    client.address,
    [client.postal_code, client.city].filter(Boolean).join(" "),
    client.email,
    client.phone,
  ]);
  if (clientBlock) {
    docPdf.text(clientBlock, marginX, y + 10, { maxWidth: 90 });
  }

  // Bloque metadata (derecha)
  const metaX = pageWidth - marginX - 60;
  docPdf.setTextColor(...COLOR_MUTED);
  docPdf.setFontSize(8);
  docPdf.setFont("helvetica", "bold");
  docPdf.text("FECHA EMISIÓN", metaX, y);
  docPdf.text("VENCIMIENTO", metaX + 32, y);
  docPdf.setFont("helvetica", "normal");
  docPdf.setTextColor(...COLOR_TEXT);
  docPdf.setFontSize(10);
  docPdf.text(fmtDate(doc.issue_date), metaX, y + 5);
  docPdf.text(fmtDate(doc.due_date), metaX + 32, y + 5);

  // ---------- Tabla de líneas ----------
  const tableHead = [["#", "Descripción", "Cant.", "Precio", "Dto.", "IGIC", "Total"]];
  const tableBody = lines.map((l, idx) => [
    String(idx + 1),
    l.description,
    Number(l.quantity).toString(),
    fmtMoney(l.unit_price),
    `${Number(l.discount_pct)}%`,
    `${Number(l.igic_rate)}%`,
    fmtMoney(l.line_total),
  ]);

  autoTable(docPdf, {
    head: tableHead,
    body: tableBody,
    startY: y + 38,
    theme: "plain",
    margin: { left: marginX, right: marginX },
    styles: {
      font: "helvetica",
      fontSize: 9,
      textColor: COLOR_TEXT,
      cellPadding: { top: 2.5, right: 2, bottom: 2.5, left: 2 },
      lineColor: COLOR_LINE,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: COLOR_PRIMARY,
      textColor: COLOR_GOLD,
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "right" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 14, halign: "right" },
      3: { cellWidth: 22, halign: "right" },
      4: { cellWidth: 14, halign: "right" },
      5: { cellWidth: 14, halign: "right" },
      6: { cellWidth: 26, halign: "right" },
    },
    didDrawPage: () => {
      // Footer en cada página
      const footerText = company?.invoice_footer ?? "";
      if (footerText) {
        docPdf.setFontSize(7);
        docPdf.setTextColor(...COLOR_MUTED);
        docPdf.text(footerText, marginX, pageHeight - 10, {
          maxWidth: pageWidth - marginX * 2,
        });
      }
      const pageStr = `Página ${docPdf.getCurrentPageInfo().pageNumber}`;
      docPdf.setFontSize(7);
      docPdf.setTextColor(...COLOR_MUTED);
      docPdf.text(pageStr, pageWidth - marginX, pageHeight - 10, {
        align: "right",
      });
    },
  });

  // ---------- Totales ----------
  const finalY =
    (docPdf as unknown as { lastAutoTable?: { finalY: number } })
      .lastAutoTable?.finalY ?? y + 80;

  const totalsX = pageWidth - marginX - 60;
  let ty = finalY + 8;

  docPdf.setFontSize(9);
  docPdf.setTextColor(...COLOR_MUTED);
  docPdf.text("Subtotal", totalsX, ty);
  docPdf.setTextColor(...COLOR_TEXT);
  docPdf.text(fmtMoney(doc.subtotal), pageWidth - marginX, ty, {
    align: "right",
  });
  ty += 5;

  docPdf.setTextColor(...COLOR_MUTED);
  docPdf.text("IGIC", totalsX, ty);
  docPdf.setTextColor(...COLOR_TEXT);
  docPdf.text(fmtMoney(doc.igic_total), pageWidth - marginX, ty, {
    align: "right",
  });
  ty += 3;

  docPdf.setDrawColor(...COLOR_LINE);
  docPdf.setLineWidth(0.2);
  docPdf.line(totalsX, ty, pageWidth - marginX, ty);
  ty += 6;

  docPdf.setFontSize(12);
  docPdf.setFont("helvetica", "bold");
  docPdf.setTextColor(...COLOR_PRIMARY);
  docPdf.text("TOTAL", totalsX, ty);
  docPdf.setTextColor(...COLOR_GOLD);
  docPdf.text(fmtMoney(doc.total), pageWidth - marginX, ty, {
    align: "right",
  });

  // ---------- Notas y datos bancarios ----------
  let ny = finalY + 8;
  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(8);
  docPdf.setTextColor(...COLOR_MUTED);

  if (doc.notes) {
    docPdf.text("NOTAS", marginX, ny);
    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(9);
    docPdf.setTextColor(...COLOR_TEXT);
    docPdf.text(doc.notes, marginX, ny + 5, { maxWidth: 100 });
    ny += 22;
  }

  if (isFactura && company?.iban) {
    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(8);
    docPdf.setTextColor(...COLOR_MUTED);
    docPdf.text("DATOS BANCARIOS", marginX, ny);
    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(9);
    docPdf.setTextColor(...COLOR_TEXT);
    docPdf.text(`IBAN: ${company.iban}`, marginX, ny + 5);
  }

  return docPdf;
}

export function downloadDocumentPdf(payload: DocumentPdfPayload) {
  const pdf = generateDocumentPdf(payload);
  const filename = `${payload.document.code ?? "documento"}.pdf`.replace(
    /[^\w\-./]/g,
    "_"
  );
  pdf.save(filename);
}
