"use server";

import { revalidatePath } from "next/cache";
import { createTypedClient } from "@/lib/supabase/typed";
import {
  computeDocument,
  computeLine,
  documentMetaSchema,
  documentSchema,
  type DocumentInput,
} from "@/lib/validations/document";

type ActionResult = { success: boolean; error?: string; id?: string };

async function requireUser() {
  const supabase = createTypedClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function buildLineInserts(documentId: string, input: DocumentInput) {
  return input.lines.map((line, idx) => {
    const computed = computeLine(line);
    return {
      document_id: documentId,
      position: idx + 1,
      product_id: line.product_id ?? null,
      description: line.description,
      quantity: line.quantity,
      unit_price: line.unit_price,
      discount_pct: line.discount_pct,
      igic_rate: line.igic_rate,
      line_subtotal: computed.line_subtotal,
      line_igic: computed.line_igic,
      line_total: computed.line_total,
    };
  });
}

function totalsFromLines(input: DocumentInput) {
  const computed = input.lines.map((l) => computeLine(l));
  return computeDocument(computed);
}

export async function createDocumentDraft(
  raw: unknown
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sesión no válida" };

  const parsed = documentSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos no válidos",
    };
  }

  const totals = totalsFromLines(parsed.data);

  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .insert({
      doc_type: parsed.data.doc_type,
      status: "borrador",
      client_id: parsed.data.client_id,
      issue_date: parsed.data.issue_date,
      due_date: parsed.data.due_date,
      notes: parsed.data.notes,
      subtotal: totals.subtotal,
      igic_total: totals.igic_total,
      total: totals.total,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (docErr || !doc) {
    return { success: false, error: docErr?.message ?? "Error al crear" };
  }

  const lineInserts = buildLineInserts(doc.id, parsed.data);
  const { error: linesErr } = await supabase
    .from("document_lines")
    .insert(lineInserts);

  if (linesErr) {
    // Limpieza best-effort: borrar el documento huérfano.
    await supabase.from("documents").delete().eq("id", doc.id);
    return { success: false, error: linesErr.message };
  }

  revalidatePath("/documentos");
  return { success: true, id: doc.id };
}

export async function updateDocumentDraft(
  id: string,
  raw: unknown
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sesión no válida" };

  const parsed = documentSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos no válidos",
    };
  }

  // Comprobar que sigue en borrador.
  const { data: existing, error: getErr } = await supabase
    .from("documents")
    .select("id, status, doc_type")
    .eq("id", id)
    .single();

  if (getErr || !existing) {
    return { success: false, error: "Documento no encontrado" };
  }
  if (existing.status !== "borrador") {
    return {
      success: false,
      error: "Sólo se pueden editar documentos en borrador",
    };
  }

  const totals = totalsFromLines(parsed.data);

  const { error: updErr } = await supabase
    .from("documents")
    .update({
      doc_type: parsed.data.doc_type,
      client_id: parsed.data.client_id,
      issue_date: parsed.data.issue_date,
      due_date: parsed.data.due_date,
      notes: parsed.data.notes,
      subtotal: totals.subtotal,
      igic_total: totals.igic_total,
      total: totals.total,
    })
    .eq("id", id);

  if (updErr) return { success: false, error: updErr.message };

  // Reemplazar líneas: borrar y reinsertar.
  const { error: delErr } = await supabase
    .from("document_lines")
    .delete()
    .eq("document_id", id);
  if (delErr) return { success: false, error: delErr.message };

  const lineInserts = buildLineInserts(id, parsed.data);
  const { error: insErr } = await supabase
    .from("document_lines")
    .insert(lineInserts);
  if (insErr) return { success: false, error: insErr.message };

  revalidatePath("/documentos");
  revalidatePath(`/documentos/${id}`);
  return { success: true, id };
}

export async function deleteDocumentDraft(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sesión no válida" };

  const { data: existing } = await supabase
    .from("documents")
    .select("id, status")
    .eq("id", id)
    .single();

  if (!existing) return { success: false, error: "Documento no encontrado" };
  if (existing.status !== "borrador") {
    return {
      success: false,
      error: "Sólo se pueden eliminar documentos en borrador",
    };
  }

  // Las líneas se borran en cascada por la FK on delete cascade.
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/documentos");
  return { success: true, id };
}

export async function emitDocumentDraft(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sesión no válida" };

  const { error } = await supabase.rpc("emit_document", { doc_id: id });
  if (error) return { success: false, error: error.message };

  revalidatePath("/documentos");
  revalidatePath(`/documentos/${id}`);
  return { success: true, id };
}

export async function createAndEmitDocument(
  raw: unknown
): Promise<ActionResult> {
  const created = await createDocumentDraft(raw);
  if (!created.success || !created.id) return created;

  const emitted = await emitDocumentDraft(created.id);
  if (!emitted.success) {
    // Documento queda como borrador; el usuario podrá emitirlo desde el detalle.
    return {
      success: false,
      error: emitted.error,
      id: created.id,
    };
  }
  return { success: true, id: created.id };
}

export async function convertAlbaranToFactura(
  id: string
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sesión no válida" };

  const { data, error } = await supabase.rpc("convert_albaran_to_invoice", {
    albaran_id: id,
  });
  if (error) return { success: false, error: error.message };

  const newId =
    (data as unknown as { id?: string } | null)?.id ?? undefined;

  revalidatePath("/documentos");
  revalidatePath(`/documentos/${id}`);
  if (newId) revalidatePath(`/documentos/${newId}`);

  return { success: true, id: newId ?? id };
}

export async function createRectificationInvoice(
  originalId: string
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sesión no válida" };

  const { data, error } = await supabase.rpc("create_rectification_invoice", {
    original_id: originalId,
  });
  if (error) return { success: false, error: error.message };

  const newId =
    (data as unknown as { id?: string } | null)?.id ?? undefined;

  revalidatePath("/documentos");
  revalidatePath(`/documentos/${originalId}`);
  if (newId) revalidatePath(`/documentos/${newId}`);

  return { success: true, id: newId ?? originalId };
}

export async function updateDocumentMeta(
  id: string,
  raw: unknown
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Sesión no válida" };

  const parsed = documentMetaSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos no válidos",
    };
  }

  const payload: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) payload.status = parsed.data.status;
  if (parsed.data.notes !== undefined) payload.notes = parsed.data.notes;

  if (Object.keys(payload).length === 0) {
    return { success: true, id };
  }

  const { error } = await supabase
    .from("documents")
    .update(payload)
    .eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/documentos");
  revalidatePath(`/documentos/${id}`);
  return { success: true, id };
}
