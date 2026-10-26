"use client";

import { useCallback, useEffect, useState } from "react";
import type { LabProduct } from "./lab-experience";

/* ═══════════════════════════════════════════════════════════════════════════
   Sesión SIMULADA del laboratorio.

   ⚠ Esto NO es autenticación. No valida contra nada, no cifra nada y las
   credenciales están escritas aquí en claro. Existe para poder enseñar el
   diseño de la pantalla de acceso y de la zona de cliente sin depender de un
   usuario real de Supabase.

   Las reservas hechas con esta sesión se guardan en el navegador y NO llegan a
   la base de datos. Al portar esto a /catalogo hay que sustituir el módulo
   entero por el login real (supabase.auth.signInWithPassword) y por
   createReservationAction, que ya existen.
   ═══════════════════════════════════════════════════════════════════════════ */

export const DEMO_EMAIL = "cliente@lingot.com";
export const DEMO_PASS  = "lingot2026";
const DEMO_NAME = "Cliente de muestra";

const SESSION_KEY = "lab-demo-session";
// v2: la v1 guardaba reservas sin `estado`. Al cambiar la clave, lo guardado
// por la versión anterior se ignora en vez de renderizarse a medias.
const ORDERS_KEY  = "lab-demo-reservas-v2";

export interface LabSession {
  name:  string;
  email: string;
}

/** Los cuatro estados que existen de verdad en la tabla `reservations`.
 *  No hay «pagada»: lo que se paga es la factura, que es otro documento. */
export type LabEstado = "pendiente" | "confirmada" | "entregada" | "cancelada";

export interface LabReserva {
  id:       string;
  name:     string;
  sku:      string | null;
  quantity: number;
  price:    number | null;
  at:       string;
  estado:   LabEstado;
  /** Código de la factura emitida. Solo las entregadas la tienen. */
  factura?: string | null;
}

/* Un mismo evento avisa a todos los componentes montados: el nav, el detalle y
   las fichas tienen que enterarse a la vez de que alguien ha entrado. */
const CHANGED = "lab:session";
const announce = () => window.dispatchEvent(new Event(CHANGED));

function readSession(): LabSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as LabSession) : null;
  } catch { return null; }
}

function readOrders(): LabReserva[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    const rows = JSON.parse(raw) as LabReserva[];
    if (!Array.isArray(rows)) return [];
    // Red de seguridad: cualquier fila sin estado se muestra como pendiente en
    // vez de pintar una etiqueta vacía.
    return rows.map((r) => ({ ...r, estado: r.estado ?? "pendiente" }));
  } catch { return []; }
}

export function useLabSession() {
  const [session, setSession] = useState<LabSession | null>(null);
  const [orders,  setOrders]  = useState<LabReserva[]>([]);
  // El servidor no puede saber si hay sesión: hasta que monta, no afirmamos nada
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => { setSession(readSession()); setOrders(readOrders()); };
    sync();
    setReady(true);
    window.addEventListener(CHANGED, sync);
    window.addEventListener("storage", sync);   // otra pestaña
    return () => {
      window.removeEventListener(CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  /** Devuelve la CLAVE del error, no el texto: quien lo pinta sabe el idioma. */
  const signIn = useCallback((email: string, pass: string): string | null => {
    if (email.trim().toLowerCase() !== DEMO_EMAIL || pass !== DEMO_PASS) {
      return "ac.badLogin";
    }
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ name: DEMO_NAME, email: DEMO_EMAIL }));
    } catch { return "ac.noStore"; }
    announce();
    return null;
  }, []);

  const signOut = useCallback(() => {
    try { localStorage.removeItem(SESSION_KEY); } catch { /* nada que hacer */ }
    announce();
  }, []);

  const reserve = useCallback((p: LabProduct, quantity: number) => {
    const next: LabReserva = {
      // Sin Date.now() ni random en el render: esto corre en un manejador
      id:       `${p.id}-${new Date().toISOString()}`,
      name:     p.name,
      sku:      p.sku,
      quantity,
      price:    p.price,
      at:       new Date().toISOString(),
      estado:   "pendiente",
    };
    try {
      localStorage.setItem(ORDERS_KEY, JSON.stringify([next, ...readOrders()].slice(0, 40)));
    } catch { /* sin persistencia, la confirmación sigue siendo válida en pantalla */ }
    announce();
  }, []);

  /**
   * Historial de muestra. Se siembra al entrar por primera vez para poder
   * enseñar los cuatro estados y la descarga de factura; se construye con
   * productos reales del catálogo, no con nombres inventados.
   */
  const seed = useCallback((products: LabProduct[]) => {
    if (readOrders().length > 0 || products.length === 0) return;
    const pick = (i: number) => products[i % products.length]!;
    const day = (back: number) => {
      const d = new Date();
      d.setDate(d.getDate() - back);
      return d.toISOString();
    };
    const rows: LabReserva[] = [
      { estado: "pendiente",  back: 1,  qty: 1, i: 0, doc: null },
      { estado: "confirmada", back: 6,  qty: 2, i: 3, doc: null },
      { estado: "entregada",  back: 19, qty: 1, i: 5, doc: "F-DEMO-0002" },
      { estado: "entregada",  back: 42, qty: 3, i: 8, doc: "F-DEMO-0001" },
      { estado: "cancelada",  back: 58, qty: 1, i: 11, doc: null },
    ].map(({ estado, back, qty, i, doc }) => {
      const p = pick(i);
      return {
        id: `seed-${i}-${back}`,
        name: p.name,
        sku: p.sku,
        quantity: qty,
        price: p.price,
        at: day(back),
        estado: estado as LabEstado,
        factura: doc,
      };
    });
    try { localStorage.setItem(ORDERS_KEY, JSON.stringify(rows)); } catch { /* sin persistencia */ }
    announce();
  }, []);

  return { session, orders, ready, signIn, signOut, reserve, seed };
}
