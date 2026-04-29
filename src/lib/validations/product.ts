import { z } from "zod";

export const PRODUCT_TYPES = ["producto", "servicio"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const METALS = ["oro", "plata"] as const;
export type Metal = (typeof METALS)[number];

export const MOVEMENT_TYPES = ["entrada", "salida", "ajuste"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

const optionalString = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v === "" || v == null ? null : v));

const optionalUuid = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v === "" || v == null ? null : v))
  .refine(
    (v) =>
      v === null ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
    { message: "Categoría no válida" }
  );

const numberFromAny = (fallback = 0) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => {
      if (typeof v === "number") return v;
      const cleaned = v.replace(",", ".").trim();
      return cleaned === "" ? fallback : Number(cleaned);
    });

const moneyNonNegative = numberFromAny(0).refine(
  (v) => Number.isFinite(v) && v >= 0,
  { message: "Debe ser un número mayor o igual a 0" }
);

const stockNonNegative = numberFromAny(0).refine(
  (v) => Number.isFinite(v) && v >= 0,
  { message: "Debe ser un número mayor o igual a 0" }
);

const weightNonNegative = numberFromAny(0).refine(
  (v) => Number.isFinite(v) && v >= 0,
  { message: "El peso debe ser ≥ 0" }
);

const purityValid = numberFromAny(0).refine(
  (v) => Number.isFinite(v) && v > 0 && v <= 1,
  { message: "La ley debe estar entre 0 y 1 (ej. 0.750 para 18k)" }
);

const optionalIgicRate = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    return n;
  })
  .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 100), {
    message: "IGIC debe estar entre 0 y 100",
  });

export const productSchema = z.object({
  type: z.enum(PRODUCT_TYPES, {
    errorMap: () => ({ message: "Tipo no válido" }),
  }),
  sku: optionalString,
  name: z
    .string({ required_error: "El nombre es obligatorio" })
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres"),
  description: optionalString,
  category_id: optionalUuid,
  metal: z.enum(METALS, {
    errorMap: () => ({ message: "Selecciona un metal (oro o plata)" }),
  }),
  weight_g: weightNonNegative,
  purity: purityValid,
  markup_per_gram: moneyNonNegative,
  markup_per_piece: moneyNonNegative,
  cost_price: moneyNonNegative,
  stock_min: stockNonNegative,
  igic_rate: optionalIgicRate,
  active: z.boolean().default(true),
});

export type ProductInput = z.infer<typeof productSchema>;

const movementQuantity = z
  .union([z.string(), z.number()])
  .transform((v) => {
    if (typeof v === "number") return v;
    const cleaned = v.replace(",", ".").trim();
    return cleaned === "" ? 0 : Number(cleaned);
  })
  .refine((v) => Number.isFinite(v) && v !== 0, {
    message: "La cantidad no puede ser 0",
  });

export const stockMovementSchema = z.object({
  movement_type: z.enum(MOVEMENT_TYPES, {
    errorMap: () => ({ message: "Tipo de movimiento no válido" }),
  }),
  quantity: movementQuantity,
  reason: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v === "" || v == null ? null : v)),
});

export type StockMovementInput = z.infer<typeof stockMovementSchema>;

/**
 * Valores comunes de ley para el selector del formulario.
 */
export const PURITY_PRESETS: { label: string; value: number }[] = [
  { label: "Oro 24k (.999)", value: 0.999 },
  { label: "Oro 22k (.916)", value: 0.916 },
  { label: "Oro 18k (.750)", value: 0.75 },
  { label: "Oro 14k (.585)", value: 0.585 },
  { label: "Oro 9k (.375)", value: 0.375 },
  { label: "Plata 999", value: 0.999 },
  { label: "Plata 925", value: 0.925 },
  { label: "Plata 900", value: 0.9 },
];
