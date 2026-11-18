import { z } from "zod";

export const DOC_TYPES = ["albaran", "factura"] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const DOC_STATUSES = [
  "borrador",
  "emitido",
  "pagado",
  "vencido",
  "cancelado",
  "convertido",
] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];

const uuid = z.string().uuid("Identificador no válido");

const numFromInput = (
  opts: { min?: number; max?: number; allowNegative?: boolean } = {}
) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => {
      if (typeof v === "number") return v;
      const cleaned = String(v).replace(",", ".").trim();
      return cleaned === "" ? 0 : Number(cleaned);
    })
    .refine((v) => Number.isFinite(v), { message: "Número no válido" })
    .refine(
      (v) =>
        (opts.allowNegative ? true : v >= 0) &&
        (opts.min === undefined || v >= opts.min) &&
        (opts.max === undefined || v <= opts.max),
      { message: "Fuera de rango" }
    );

const optionalString = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v === "" || v == null ? null : v));

const optionalDate = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v === "" || v == null ? null : v))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), {
    message: "Fecha no válida",
  });

const lineShape = {
  product_id: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v === "" || v == null ? null : v)),
  description: z
    .string({ required_error: "Descripción obligatoria" })
    .trim()
    .min(1, "Descripción obligatoria"),
  quantity: numFromInput({ min: 0.001 }),
  unit_price: numFromInput(),
  discount_pct: numFromInput({ min: 0, max: 100 }),
  igic_rate: numFromInput({ min: 0, max: 100 }),
  // Trazabilidad de lote (identificación específica). No editable manualmente.
  lot_id: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v === "" || v == null ? null : v)),
  unit_cost: z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v === null || v === undefined || v === "") return null;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    }),
};

export const documentLineSchema = z.object(lineShape);

/**
 * Líneas de una factura rectificativa: admiten importes en negativo.
 *   · cantidad negativa → devolución de piezas (vuelven al stock al emitir)
 *   · precio negativo con cantidad positiva → rebaja, sin mover stock
 */
export const rectificationLineSchema = z.object({
  ...lineShape,
  quantity: numFromInput({ allowNegative: true }).refine((v) => v !== 0, {
    message: "La cantidad no puede ser 0",
  }),
  unit_price: numFromInput({ allowNegative: true }),
});

export type DocumentLineInput = z.infer<typeof documentLineSchema>;

const documentShape = {
  doc_type: z.enum(DOC_TYPES, {
    errorMap: () => ({ message: "Tipo de documento no válido" }),
  }),
  client_id: uuid,
  issue_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida"),
  due_date: optionalDate,
  notes: optionalString,
  lines: z
    .array(documentLineSchema)
    .min(1, "Añade al menos una línea"),
};

export const documentSchema = z.object(documentShape);

// El tipo se fuerza a factura en el servidor (updateDocumentDraft).
export const rectificationDocumentSchema = z.object({
  ...documentShape,
  lines: z
    .array(rectificationLineSchema)
    .min(1, "Añade al menos una línea"),
});

/** Esquema de validación según el documento sea o no una rectificativa. */
export function documentSchemaFor(isRectification: boolean): typeof documentSchema {
  // Misma forma de datos; solo cambian los límites de cantidad y precio
  return (isRectification ? rectificationDocumentSchema : documentSchema) as typeof documentSchema;
}

export type DocumentInput = z.infer<typeof documentSchema>;

// Sólo para rol contabilidad: actualizar status/notes del documento.
export const documentMetaSchema = z.object({
  status: z.enum(DOC_STATUSES).optional(),
  notes: optionalString.optional(),
});

export type DocumentMetaInput = z.infer<typeof documentMetaSchema>;

// ---- Cálculos ----
/** Redondeo a céntimos, simétrico: −10,005 → −10,01 igual que 10,005 → 10,01. */
export function round2(n: number): number {
  return (Math.sign(n) * Math.round((Math.abs(n) + Number.EPSILON) * 100)) / 100;
}

export interface ComputedLine {
  line_subtotal: number;
  line_igic: number;
  line_total: number;
}

export function computeLine(input: {
  quantity: number;
  unit_price: number;
  discount_pct: number;
  igic_rate: number;
}): ComputedLine {
  const subtotal = round2(
    input.quantity * input.unit_price * (1 - input.discount_pct / 100)
  );
  const igic = round2((subtotal * input.igic_rate) / 100);
  const total = round2(subtotal + igic);
  return { line_subtotal: subtotal, line_igic: igic, line_total: total };
}

export interface ComputedDocument {
  subtotal: number;
  igic_total: number;
  total: number;
}

export function computeDocument(lines: ComputedLine[]): ComputedDocument {
  const subtotal = round2(lines.reduce((s, l) => s + l.line_subtotal, 0));
  const igic_total = round2(lines.reduce((s, l) => s + l.line_igic, 0));
  const total = round2(subtotal + igic_total);
  return { subtotal, igic_total, total };
}

// ---- Signo en libros e informes ----
/**
 * Factor para sumar el importe de un documento en libros e informes.
 *
 * Las rectificativas se guardan en negativo desde la migración 032, así que
 * se suman tal cual. Las emitidas antes se guardaron en positivo y no se
 * pueden reescribir (su huella Veri*factu incluye el total): se reconocen por
 * no tener `emitted_at` y se restan.
 */
export function bookSign(doc: {
  rectification_of_invoice_id?: string | null;
  emitted_at?: string | null;
  total?: number | string | null;
}): 1 | -1 {
  return doc.rectification_of_invoice_id && !doc.emitted_at && Number(doc.total ?? 0) > 0
    ? -1
    : 1;
}
