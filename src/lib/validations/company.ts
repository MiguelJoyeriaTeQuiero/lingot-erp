import { z } from "zod";
import { validateSpanishTaxId } from "./spanish-id";

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

const optionalUrl = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v === "" || v == null ? null : v))
  .refine(
    (v) => v === null || z.string().url().safeParse(v).success,
    { message: "URL no válida" }
  );

const optionalPostalCode = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v === "" || v == null ? null : v))
  .refine((v) => v === null || /^[0-9]{5}$/.test(v), {
    message: "Código postal debe tener 5 dígitos",
  });

const optionalTaxId = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v === "" || v == null ? null : v?.toUpperCase() ?? null))
  .refine((v) => v === null || validateSpanishTaxId(v), {
    message: "CIF/NIF/NIE no válido",
  });

// IBAN básico: 4 letras de país + dígitos. Validamos largo (15-34) y prefijo.
const optionalIban = z
  .string()
  .trim()
  .nullish()
  .transform((v) =>
    v === "" || v == null ? null : v.replace(/\s+/g, "").toUpperCase()
  )
  .refine(
    (v) => v === null || /^[A-Z]{2}[0-9A-Z]{13,32}$/.test(v),
    { message: "IBAN no válido" }
  );

export const companySettingsSchema = z.object({
  legal_name: optionalString,
  trade_name: optionalString,
  tax_id: optionalTaxId,
  address: optionalString,
  city: optionalString,
  postal_code: optionalPostalCode,
  country: optionalString,
  email: optionalEmail,
  phone: optionalString,
  website: optionalUrl,
  iban: optionalIban,
  default_igic_rate: z.coerce
    .number({ invalid_type_error: "Tipo de IGIC no válido" })
    .min(0, "Mínimo 0%")
    .max(100, "Máximo 100%"),
  default_payment_days: z.coerce
    .number({ invalid_type_error: "Días no válidos" })
    .int("Debe ser un número entero")
    .min(0, "Mínimo 0 días")
    .max(365, "Máximo 365 días"),
  invoice_footer: optionalString,
  metal_markup_pct: z.coerce
    .number({ invalid_type_error: "Margen no válido" })
    .min(0, "Mínimo 0%")
    .max(100, "Máximo 100%"),
});

export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;
