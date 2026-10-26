/* ═══════════════════════════════════════════════════════════════════════════
   Consentimiento de cookies — módulo sin "use client" a propósito: la política
   de cookies (de servidor) necesita el nombre y la duración como texto, no como
   referencia de cliente. Las funciones que tocan document solo se llaman desde
   el navegador.

   Hoy la web no usa ninguna cookie opcional: el banner recoge la elección y
   la deja lista. Al incorporar una herramienta (Analytics, un píxel…):
     1. cárgala dentro de <ConsentGate category="…"> (lab-consent.tsx);
     2. añade sus cookies a OPTIONAL_COOKIES, para borrarlas si se retira el
        permiso, y a la tabla de /cookies, con su titular y duración;
     3. sube CONSENT_VERSION: quien ya eligió vuelve a ver el banner, porque
        un permiso dado antes de saber qué tercero entra no vale para él.
   ═══════════════════════════════════════════════════════════════════════════ */

export type ConsentCategory = "analytics" | "marketing";

export interface Consent {
  v:         number;
  analytics: boolean;
  marketing: boolean;
  /** Cuándo se eligió (ISO): sirve de prueba y para caducar la elección. */
  at:        string;
}

export const CONSENT_COOKIE = "lingot-consent";
export const CONSENT_VERSION = 1;
/** Doce meses: dentro de los 24 que la AEPD fija como máximo para renovarlo. */
export const CONSENT_MAX_AGE_DAYS = 365;

/** Lo emite cada cambio de elección; el detalle es el Consent nuevo. */
export const CONSENT_EVENT = "lab:consent";
/** Pide abrir el panel de configuración (pie, política de cookies). */
export const CONSENT_OPEN_EVENT = "lab:consent-open";

/** Prefijos de las cookies de cada categoría, para borrarlas al retirar el permiso. */
const OPTIONAL_COOKIES: Record<ConsentCategory, string[]> = {
  analytics: ["_ga", "_gid", "_gat"],
  marketing: ["_gcl", "_fbp", "_fbc"],
};

export function readConsent(): Consent | null {
  try {
    const raw = document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
    if (!raw) return null;
    const c = JSON.parse(decodeURIComponent(raw.slice(CONSENT_COOKIE.length + 1))) as Consent;
    // De otra versión de la política: hay que volver a preguntar
    return c.v === CONSENT_VERSION ? c : null;
  } catch {
    return null;
  }
}

export function writeConsent(choice: Pick<Consent, ConsentCategory>): Consent {
  const consent: Consent = { v: CONSENT_VERSION, ...choice, at: new Date().toISOString() };
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(consent))}; Path=/; ` +
    `Max-Age=${CONSENT_MAX_AGE_DAYS * 86400}; SameSite=Lax${secure}`;

  for (const cat of Object.keys(OPTIONAL_COOKIES) as ConsentCategory[]) {
    if (!consent[cat]) dropCookies(OPTIONAL_COOKIES[cat]);
  }

  window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: consent }));
  return consent;
}

export function openConsentSettings() {
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}

/** Las herramientas suelen escribir en el dominio raíz (.lingot.vip), no en el
 *  de la página: se borra en los dos. */
function dropCookies(prefixes: string[]) {
  if (!prefixes.length) return;
  const host = location.hostname;
  const root = host.split(".").slice(-2).join(".");
  for (const c of document.cookie.split("; ")) {
    const name = c.split("=")[0] ?? "";
    if (!prefixes.some((p) => name.startsWith(p))) continue;
    for (const domain of ["", `; Domain=${host}`, `; Domain=.${root}`]) {
      document.cookie = `${name}=; Path=/; Max-Age=0${domain}`;
    }
  }
}
