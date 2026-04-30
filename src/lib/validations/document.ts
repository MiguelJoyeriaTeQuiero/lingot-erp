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

export const documentLineSchema = z.object({
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
});

export type DocumentLineInput = z.infer<typeof documentLineSchema>;

export const documentSchema = z.object({
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
});

export type DocumentInput = z.infer<typeof documentSchema>;

// Sólo para rol contabilidad: actualizar status/notes del documento.
export const documentMetaSchema = z.object({
  status: z.enum(DOC_STATUSES).optional(),
  notes: optionalString.optional(),
});

export type DocumentMetaInput = z.infer<typeof documentMetaSchema>;

// ---- Cálculos ----
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
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
