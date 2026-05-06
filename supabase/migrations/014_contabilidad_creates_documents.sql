-- Permite al rol contabilidad crear y eliminar borradores de documentos.
-- Admin ya tiene acceso total vía documents_admin_all / document_lines_admin_all.

-- INSERT en documents (crear borrador)
drop policy if exists documents_insert on public.documents;
create policy documents_insert on public.documents
  for insert with check (public.is_authenticated());

-- INSERT en document_lines (crear líneas del documento)
drop policy if exists document_lines_insert on public.document_lines;
create policy document_lines_insert on public.document_lines
  for insert with check (public.is_authenticated());

-- DELETE en document_lines (necesario para updateDocumentDraft: borra y reinserta líneas)
drop policy if exists document_lines_delete on public.document_lines;
create policy document_lines_delete on public.document_lines
  for delete using (public.is_authenticated());

-- DELETE en documents (eliminar borrador propio)
drop policy if exists documents_delete on public.documents;
create policy documents_delete on public.documents
  for delete using (public.is_authenticated() and status = 'borrador');
