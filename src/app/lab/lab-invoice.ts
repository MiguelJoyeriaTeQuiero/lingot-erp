import { downloadDocumentPdf } from "@/lib/pdf/document-pdf";
import type {
  ClientRow,
  CompanySettingsRow,
  DocumentLineRow,
  DocumentRow,
} from "@/lib/supabase/typed";
import type { LabCompany } from "./lab-experience";
import type { LabReserva } from "./lab-session";

/* ═══════════════════════════════════════════════════════════════════════════
   Factura del laboratorio.

   Usa el MISMO generador que el ERP (src/lib/pdf/document-pdf.ts), así que el
   PDF sale idéntico al que descarga un cliente desde /catalogo/mi-cuenta: mismo
   membrete, misma tabla, mismos colores de marca. Lo que cambia es de dónde
   salen los datos: el emisor es real (company_settings) y el destinatario y el
   documento son de muestra.

   ⚠ El documento se marca como demostración en su código y en sus notas, y se
   imprime así en el PDF. No es una factura válida y no debe parecerlo.
   ═══════════════════════════════════════════════════════════════════════════ */

const IGIC_DEFAULT = 0;

export async function downloadLabInvoice(r: LabReserva, company: LabCompany) {
  const igicRate = Number(company?.default_igic_rate ?? IGIC_DEFAULT);
  const unit     = Number(r.price ?? 0);
  const subtotal = unit * r.quantity;
  const igic     = subtotal * (igicRate / 100);

  const issue = new Date(r.at);
  const iso   = (d: Date) => d.toISOString().slice(0, 10);

  const document = {
    code:       r.factura ?? "F-DEMO-0000",
    doc_type:   "factura",
    status:     "pagada",
    issue_date: iso(issue),
    due_date:   iso(issue),
    subtotal,
    igic_total: igic,
    total:      subtotal + igic,
    notes:
      "DOCUMENTO DE DEMOSTRACIÓN generado en el laboratorio de diseño. " +
      "No corresponde a una operación real y carece de validez fiscal.",
  } as unknown as DocumentRow;

  const lines = [
    {
      description: r.sku ? `${r.name} · Ref. ${r.sku}` : r.name,
      quantity:    r.quantity,
      unit_price:  unit,
      igic_rate:   igicRate,
      line_total:  subtotal,
      page:        null,
    },
  ] as unknown as DocumentLineRow[];

  const client = {
    name:        "Cliente de muestra",
    type:        "particular",
    tax_id:      "DEMO",
    address:     "Dirección de muestra",
    city:        "Santa Cruz de Tenerife",
    postal_code: "38001",
    phone:       null,
  } as unknown as ClientRow;

  await downloadDocumentPdf({
    document,
    lines,
    client,
    company: (company ?? null) as unknown as CompanySettingsRow | null,
  });
}
