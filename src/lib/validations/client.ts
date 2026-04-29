import { z } from "zod";
import {
  validateCIF,
  validateNIF,
  validateNIE,
  validateSpanishTaxId,
} from "./spanish-id";

// Enum de precios alineado con el esquema de BD: A / B / C / especial.
export const PRICE_TIERS = ["A", "B", "C", "especial"] as const;
export type PriceTier = (typeof PRICE_TIERS)[number];

const optionalString = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v === "" || v == null ? null : v));

const optionalEmail = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v === "" || v == null ? null : v))
  .refine(
    (v) => v === null || z.string().email().safeParse(v).success,
    { message: "Email no válido" }
  );

const optionalPostalCode = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v === "" || v == null ? null : v))
  .refine((v) => v === null || /^[0-9]{5}$/.test(v), {
    message: "Código postal debe tener 5 dígitos",
  });

export const clientBaseSchema = z.object({
  name: z
    .string({ required_error: "El nombre es obligatorio" })
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres"),
  email: optionalEmail,
  phone: optionalString,
  address: optionalString,
  city: optionalString,
  postal_code: optionalPostalCode,
  price_tier: z.enum(PRICE_TIERS, {
    errorMap: () => ({ message: "Tarifa no válida" }),
  }),
  notes: optionalString,
  active: z.boolean().default(true),
});

export const clientParticularSchema = clientBaseSchema.extend({
  type: z.literal("particular"),
  tax_id: z
    .string()
    .trim()
    .min(1, "El NIF/NIE es obligatorio")
    .refine(
      (v) => validateNIF(v) || validateNIE(v),
      { message: "NIF o NIE no válido" }
    )
    .transform((v) => v.toUpperCase()),
  contact_name: optionalString,
});

export const clientEmpresaSchema = clientBaseSchema.extend({
  type: z.literal("empresa"),
  tax_id: z
    .string()
    .trim()
    .min(1, "El CIF/NIF es obligatorio")
    .refine(
      (v) => validateCIF(v) || validateNIF(v),
      { message: "CIF o NIF no válido" }
    )
    .transform((v) => v.toUpperCase()),
  contact_name: z
    .string({ required_error: "La persona de contacto es obligatoria" })
    .trim()
    .min(2, "Introduce al menos 2 caracteres"),
});

export const clientSchema = z.discriminatedUnion("type", [
  clientParticularSchema,
  clientEmpresaSchema,
]);

export type ClientInput = z.infer<typeof clientSchema>;

export { validateSpanishTaxId };
