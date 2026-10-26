import type { ReactNode } from "react";
import { TITULAR } from "./lab-legal-data";

/* ═══════════════════════════════════════════════════════════════════════════
   Piezas de los textos legales. Sin "use client": las usan las páginas, que
   son de servidor, y no necesitan estado ni idioma (los textos van en español).
   ═══════════════════════════════════════════════════════════════════════════ */

/** En desarrollo los huecos se ven en rojo para que nadie los pase por alto;
 *  en producción no se publican: ni el hueco ni un dato inventado. */
const SHOW_PENDING = process.env.NODE_ENV !== "production";

/** Dato que no consta en ninguna fuente. `block` lo saca como párrafo propio. */
export function Pending({ children, block = false }: { children: ReactNode; block?: boolean }) {
  if (!SHOW_PENDING) return null;
  const mark = <mark className="lab-legal-pending">Pendiente: {children}</mark>;
  return block ? <p>{mark}</p> : mark;
}

/**
 * Tabla legible en móvil: por debajo de 640 px cada fila pasa a ficha y cada
 * celda lleva delante el nombre de su columna (data-label, lo pinta el CSS).
 */
export function LegalTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <table className="lab-legal-table">
      <thead>
        <tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => <td key={j} data-label={head[j]}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TitularMail() {
  return <a href={`mailto:${TITULAR.email}`}>{TITULAR.email}</a>;
}

/** Identificación del titular (art. 10 LSSI y art. 13.1.a RGPD). */
export function TitularList() {
  const registro = TITULAR.registro ?? (SHOW_PENDING
    ? <Pending>datos de inscripción en el Registro Mercantil de Santa Cruz de Tenerife (tomo, folio y hoja)</Pending>
    : null);
  const rows: [string, ReactNode][] = [
    ["Titular", TITULAR.razonSocial],
    ["Nombre comercial", `${TITULAR.marca} (${TITULAR.grupo})`],
    ["NIF", TITULAR.nif],
    ["Domicilio", TITULAR.domicilio],
    ["Registro", registro],
    ["Correo electrónico", <TitularMail key="m" />],
    ["Teléfono", <a key="t" href={TITULAR.telefonoHref}>{TITULAR.telefono}</a>],
    ["Sitio web", TITULAR.web],
  ];
  return (
    <dl className="lab-legal-id">
      {rows.filter(([, v]) => v != null).map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
