import type { Metadata } from "next";
import Link from "next/link";
import { LabLegalPage, type LegalSection } from "../lab-legal";
import { LegalTable, TitularMail } from "../lab-legal-parts";
import { TITULAR } from "../lab-legal-data";
import { LAB_PATHS } from "../lab-paths";
import { THEME_KEY } from "../lab-theme-boot";
import { LANG_KEY } from "../lab-i18n";
import { CONSENT_COOKIE, CONSENT_MAX_AGE_DAYS } from "../lab-consent-store";
import { ConsentSettingsButton } from "../lab-consent";

export const metadata: Metadata = {
  title: "Política de cookies · Lingot",
  description: "Qué cookies usa Lingot, cuáles son opcionales y cómo aceptarlas, rechazarlas o cambiar tu elección.",
};

/* Inventario real (octubre de 2026): la cookie de sesión de Supabase
   (@supabase/ssr, 400 días por defecto) y dos claves de localStorage que solo
   se escriben al pulsar el selector. Ni analítica, ni píxeles, ni fuentes de
   terceros: las tipografías se sirven desde la propia web. El aviso de cookies
   (lab-consent.tsx) ya recoge permiso para análisis y marketing, pero ninguna
   herramienta lo usa todavía. Al añadir una, va a la tabla con su titular y
   duración, y se sube CONSENT_VERSION (lab-consent-store.ts). */

const CONSENT_MONTHS = Math.round(CONSENT_MAX_AGE_DAYS / 30.4);

const BROWSERS: [string, string][] = [
  ["Google Chrome", "https://support.google.com/chrome/answer/95647?hl=es"],
  ["Mozilla Firefox", "https://support.mozilla.org/es/kb/borrar-cookies-y-datos-del-sitio-en-firefox"],
  ["Safari en Mac", "https://support.apple.com/es-es/guide/safari/sfri11471/mac"],
  ["Safari en iPhone y iPad", "https://support.apple.com/es-es/105082"],
  ["Microsoft Edge", "https://support.microsoft.com/es-es/microsoft-edge/eliminar-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"],
];

const SECTIONS: LegalSection[] = [
  {
    id: "que-son",
    title: "Qué son las cookies",
    body: (
      <p>
        Las cookies son pequeños archivos que una web guarda en tu navegador para recordar información entre una
        página y otra o entre visitas. Otras tecnologías hacen lo mismo de otra forma, como el almacenamiento local
        del navegador (localStorage). En esta política llamamos «cookies» a todas ellas, como hace el artículo 22.2
        de la Ley 34/2002 de servicios de la sociedad de la información (LSSI).
      </p>
    ),
  },
  {
    id: "cuales",
    title: "Qué cookies usamos",
    body: (
      <>
        <p>
          Hoy la web solo usa cookies necesarias. Todas son propias: las crea {TITULAR.web} y no se comparten con
          terceros.
        </p>
        <LegalTable
          head={["Nombre", "Tipo", "Para qué sirve", "Duración"]}
          rows={[
            [
              <><code>sb-…-auth-token</code> (puede dividirse en partes terminadas en <code>.0</code>, <code>.1</code>…)</>,
              "Cookie técnica",
              "Mantener tu sesión iniciada en el área privada de clientes. Solo se crea cuando inicias sesión.",
              "Hasta que cierras la sesión y, como máximo, 400 días.",
            ],
            [
              <code>{CONSENT_COOKIE}</code>,
              "Cookie técnica",
              "Guardar tu elección sobre las cookies opcionales, para no volver a preguntarte en cada visita.",
              `${CONSENT_MONTHS} meses, o hasta que cambies tu elección.`,
            ],
            [
              <code>{LANG_KEY}</code>,
              "Almacenamiento local, de preferencias",
              "Recordar el idioma que eliges en el selector ES · EN · DE. Solo se guarda si lo cambias.",
              "Hasta que borres los datos de navegación.",
            ],
            [
              <code>{THEME_KEY}</code>,
              "Almacenamiento local, de preferencias",
              "Recordar el tema de color que eliges (oro o plata). Solo se guarda si lo cambias.",
              "Hasta que borres los datos de navegación.",
            ],
          ]}
        />
        <p>
          Mientras no elijas idioma ni tema, la web los deduce de la configuración de tu navegador sin guardar nada.
          El área de gestión interna, reservada al personal de {TITULAR.marca}, usa la misma cookie de sesión y un
          registro técnico local para avisar de las reservas nuevas.
        </p>
      </>
    ),
  },
  {
    id: "consentimiento",
    title: "Cookies opcionales y tu consentimiento",
    body: (
      <>
        <p>
          Las cookies de la tabla anterior están exentas de consentimiento según el artículo 22.2 de la LSSI y la
          Guía sobre el uso de las cookies de la Agencia Española de Protección de Datos: la de sesión es
          imprescindible para prestarte el servicio que pides al iniciar sesión, las de idioma y tema guardan una
          preferencia que eliges de forma expresa y la de consentimiento recuerda tu decisión.
        </p>
        <p>Además, el aviso de cookies te pide permiso para dos categorías opcionales:</p>
        <ul>
          <li>
            <strong>Análisis:</strong> nos dicen, de forma agregada, qué páginas se visitan y cómo se llega a ellas,
            para mejorar la web.
          </li>
          <li>
            <strong>Marketing:</strong> miden la eficacia de nuestros anuncios y campañas y permiten mostrarte
            publicidad relevante.
          </li>
        </ul>
        <p>
          Hoy no usamos ninguna cookie de estas categorías, así que aceptarlas todavía no activa nada. Cuando
          incorporemos alguna herramienta, la añadiremos a la tabla —con su titular, su finalidad y su duración— y
          te volveremos a pedir permiso antes de usarla.
        </p>
        <p>
          Las cookies opcionales nunca se instalan sin tu consentimiento; rechazarlas es tan sencillo como
          aceptarlas y no te impide usar la web. Puedes cambiar tu elección o retirar el consentimiento en
          cualquier momento desde «Configurar cookies», al pie de cada página o aquí mismo:
        </p>
        <p>
          <ConsentSettingsButton className="lab-cta" />
        </p>
      </>
    ),
  },
  {
    id: "terceros",
    title: "Contenido de terceros",
    body: (
      <p>
        Algunas imágenes de los artículos de Análisis se cargan desde los servidores de Unsplash. Al mostrarlas, tu
        navegador se conecta con ese servicio, que recibe datos técnicos como tu dirección IP para poder
        entregarte la imagen. {TITULAR.marca} no instala cookies a través de esas imágenes.
      </p>
    ),
  },
  {
    id: "gestionar",
    title: "Cómo ver, borrar o bloquear las cookies",
    body: (
      <>
        <p>Puedes ver, borrar o bloquear las cookies y el almacenamiento local desde la configuración de tu navegador:</p>
        <ul>
          {BROWSERS.map(([name, href]) => (
            <li key={name}>
              <a href={href} target="_blank" rel="noopener noreferrer">{name}</a>
            </li>
          ))}
        </ul>
        <p>
          La mayoría de navegadores también permiten borrar solo los datos de {TITULAR.web} desde el icono que
          aparece junto a la dirección de la página. Si bloqueas o borras la cookie de sesión tendrás que volver a
          iniciar sesión, y no podrás usar el área privada mientras siga bloqueada. Si borras el idioma o el tema, la
          web volverá a deducirlos de tu navegador.
        </p>
      </>
    ),
  },
  {
    id: "cambios",
    title: "Actualizaciones y contacto",
    body: (
      <p>
        Revisaremos esta política cada vez que cambien las cookies que usa la web; la fecha de la última
        actualización figura al principio. Si tienes dudas, escríbenos a <TitularMail />. Cómo tratamos tus datos
        personales se explica en la <Link href={LAB_PATHS.privacy}>Política de privacidad</Link>.
      </p>
    ),
  },
];

export default function CookiesPage() {
  return (
    <LabLegalPage
      doc="cookies"
      title="Política de cookies"
      lead="Qué cookies usa la web, cuáles son opcionales y cómo aceptarlas, rechazarlas o cambiar de opinión cuando quieras."
      sections={SECTIONS}
    />
  );
}
