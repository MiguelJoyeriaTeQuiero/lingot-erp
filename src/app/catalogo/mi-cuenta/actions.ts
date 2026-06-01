"use server";

import { createTypedClient } from "@/lib/supabase/typed";
import { createRawAdminClient } from "@/lib/supabase/admin";
import type { DocumentPdfPayload } from "@/lib/pdf/document-pdf";

type Result =
  | { success: true; payload: DocumentPdfPayload }
  | { success: false; error: string };

/**
 * Devuelve el payload completo para generar el PDF de una factura del cliente.
 * Verifica que el documento pertenece al cliente autenticado (por email) y que
 * no es un borrador antes de exponer ningún dato.
 */
export async function getClientDocumentPdfAction(
  documentId: string
): Promise<Result> {
  const supabase = createTypedClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "No autenticado." };
  }

  const admin = createRawAdminClient();

  // 1. Localizar el cliente asociado al email del usuario autenticado.
  const { data: clientRows } = await admin
    .from("clients")
    .select("*")
    .ilike("email", user.email ?? "")
    .limit(1);

  const client = clientRows?.[0] ?? null;
  if (!client) {
    return { success: false, error: "No se ha encontrado tu ficha de cliente." };
  }

  // 2. Cargar el documento y comprobar que es del cliente y no un borrador.
  const { data: doc } = await admin
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();

  if (!doc || doc.client_id !== client.id || doc.status === "borrador") {
    return { success: false, error: "Documento no disponible." };
  }

  // 3. Cargar líneas y datos de empresa para el PDF.
  const [linesRes, companyRes] = await Promise.all([
    admin
      .from("document_lines")
      .select("*")
      .eq("document_id", doc.id)
      .order("position"),
    admin.from("company_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  return {
    success: true,
    payload: {
      document: doc,
      lines: linesRes.data ?? [],
      client,
      company: companyRes.data ?? null,
      verifactuHash: (doc as { verifactu_hash?: string | null }).verifactu_hash,
    } as DocumentPdfPayload,
  };
}
