/* ═══════════════════════════════════════════════════════════════════════════
   Datos del titular para los textos legales (aviso legal, privacidad, cookies,
   condiciones y las cláusulas cortas de los formularios). Un solo sitio: si
   cambia el domicilio o el correo, cambia aquí y en ningún otro.

   Origen: company_settings en Supabase (razón social, NIF, domicilio) y la web
   publicada (correo y teléfono del bloque de contacto de la portada).

   Lo que vale null no consta en ninguna fuente y los textos lo enseñan como
   PENDIENTE: no se publica un dato registral inventado.
   ═══════════════════════════════════════════════════════════════════════════ */

export const TITULAR = {
  /** En la base figura «Te quiero Metales»; la B del NIF es la de una S.L. */
  razonSocial:  "Te Quiero Metales, S.L.",
  marca:        "Lingot",
  grupo:        "Te Quiero Group",
  nif:          "B76620210",
  /** ⚠ Revisar: en company_settings la dirección lleva el CP 38296 y el campo
   *  aparte dice 38108; tampoco consta número de vía. */
  domicilio:    "Carretera General San Miguel de Geneto, 38296 San Cristóbal de La Laguna, Santa Cruz de Tenerife (España)",
  /** El mismo domicilio por partes, para los datos estructurados (lab-seo).
   *  Sin código postal hasta aclarar cuál es: uno equivocado resta en el SEO
   *  local más que ninguno. */
  direccion: {
    calle:     "Carretera General San Miguel de Geneto",
    localidad: "San Cristóbal de La Laguna",
    provincia: "Santa Cruz de Tenerife",
    pais:      "ES",
    cp:        null as string | null,
  },
  /** Tomo, folio y hoja del Registro Mercantil (art. 10 LSSI). */
  registro:     null as string | null,
  email:        "info@lingot.com",
  telefono:     "+34 669 39 31 97",
  telefonoHref: "tel:+34669393197",
  web:          "lingot.vip",
};

/** Fecha de la versión vigente de los cuatro textos (ISO). */
export const LEGAL_UPDATED = "2026-10-26";
