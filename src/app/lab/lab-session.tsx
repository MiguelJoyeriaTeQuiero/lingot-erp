"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createReservationAction } from "@/app/catalogo/actions";
import type { LabProduct } from "./lab-experience";

/* ═══════════════════════════════════════════════════════════════════════════
   Sesión del cliente: la misma cuenta de Supabase que usa /catalogo.

   La sesión, las reservas y los documentos llegan del servidor (page.tsx). Al
   entrar, salir o reservar se pide al servidor que vuelva a pintar la página
   (router.refresh) y los datos nuevos bajan por aquí, sin estado propio que
   pueda desincronizarse de la base.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface LabSession {
  name:        string;
  email:       string;
  isWholesale: boolean;
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
}

/** Documento emitido a la ficha del cliente (factura, albarán…). Nunca borradores. */
export interface LabDocumento {
  id:     string;
  code:   string | null;
  type:   string;
  date:   string;
  total:  number | null;
  estado: string;
}

interface Value {
  session:   LabSession | null;
  orders:    LabReserva[];
  documents: LabDocumento[];
  /** Devuelven la CLAVE del error, no el texto: quien lo pinta sabe el idioma. */
  signIn:  (email: string, pass: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  reserve: (p: LabProduct, quantity: number, extra?: { phone?: string; note?: string }) => Promise<string | null>;
}

const SessionContext = createContext<Value | null>(null);

export function LabSessionProvider({
  session, orders, documents, children,
}: {
  session:   LabSession | null;
  orders:    LabReserva[];
  documents: LabDocumento[];
  children:  ReactNode;
}) {
  const router = useRouter();

  const signIn = useCallback(async (email: string, pass: string) => {
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password: pass });
    if (error) return "ac.badLogin";
    router.refresh();
    return null;
  }, [router]);

  const signOut = useCallback(async () => {
    await createClient().auth.signOut();
    router.refresh();
  }, [router]);

  const reserve = useCallback(async (p: LabProduct, quantity: number, extra?: { phone?: string; note?: string }) => {
    const result = await createReservationAction({
      product_id:     p.id,
      product_name:   p.name,
      product_sku:    p.sku,
      quantity,
      price_snapshot: p.price ?? 0,
      phone:          extra?.phone ?? "",
      note:           extra?.note ?? "",
    });
    if ("error" in result) return "d.error";
    router.refresh();
    return null;
  }, [router]);

  const value = useMemo(
    () => ({ session, orders, documents, signIn, signOut, reserve }),
    [session, orders, documents, signIn, signOut, reserve]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useLabSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useLabSession necesita un LabSessionProvider por encima");
  return value;
}
