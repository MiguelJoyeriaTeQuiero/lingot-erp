"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ClientRow, DocumentRow } from "@/lib/supabase/typed";

interface DocumentsTableProps {
  documents: DocumentRow[];
  clients: ClientRow[];
}

const statusToBadge: Record<string, BadgeVariant> = {
  borrador: "borrador",
  emitido: "emitido",
  pagado: "pagado",
  vencido: "vencido",
  cancelado: "cancelado",
  convertido: "convertido",
  rectificada: "rectificada",
};

export function DocumentsTable({ documents, clients }: DocumentsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "albaran" | "factura">(
    "all"
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const clientById = useMemo(() => {
    const map = new Map<string, ClientRow>();
    for (const c of clients) map.set(c.id, c);
    return map;
  }, [clients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((d) => {
      if (typeFilter !== "all" && d.doc_type !== typeFilter) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (!q) return true;
      const client = clientById.get(d.client_id);
      return (
        (d.code ?? "").toLowerCase().includes(q) ||
        (client?.name ?? "").toLowerCase().includes(q) ||
        (client?.tax_id ?? "").toLowerCase().includes(q)
      );
    });
  }, [documents, search, typeFilter, statusFilter, clientById]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          />
          <Input
            placeholder="Buscar por número o cliente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
        >
          <option value="all">Todos los tipos</option>
          <option value="albaran">Albaranes</option>
          <option value="factura">Facturas</option>
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="emitido">Emitido</option>
          <option value="pagado">Pagado</option>
          <option value="vencido">Vencido</option>
          <option value="convertido">Convertido</option>
          <option value="cancelado">Cancelado</option>
          <option value="rectificada">Rectificada</option>
        </Select>
      </div>

      <div className="rounded-md border border-border bg-surface">
        <Table>
          <THead>
            <TR>
              <TH>Nº</TH>
              <TH>Fecha</TH>
              <TH>Tipo</TH>
              <TH>Cliente</TH>
              <TH className="text-right">Total</TH>
              <TH>Estado</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.length === 0 ? (
              <TR>
                <TD colSpan={6} className="py-10 text-center text-text-muted">
                  No hay documentos con esos criterios.
                </TD>
              </TR>
            ) : (
              filtered.map((d) => {
                const client = clientById.get(d.client_id);
                return (
                  <TR
                    key={d.id}
                    onClick={() => router.push(`/documentos/${d.id}`)}
                    className="cursor-pointer"
                  >
                    <TD className="font-medium text-text">
                      {d.code ?? (
                        <span className="text-text-muted italic">
                          (borrador)
                        </span>
                      )}
                    </TD>
                    <TD className="text-text-muted">
                      {formatDate(d.issue_date)}
                    </TD>
                    <TD>
                      <Badge variant="neutral">
                        {d.doc_type === "factura" ? "Factura" : "Albarán"}
                      </Badge>
                    </TD>
                    <TD className="text-text-muted">
                      {client?.name ?? "—"}
                    </TD>
                    <TD className="text-right">{formatCurrency(d.total)}</TD>
                    <TD>
                      <Badge variant={statusToBadge[d.status] ?? "neutral"} />
                    </TD>
                  </TR>
                );
              })
            )}
          </TBody>
        </Table>
      </div>

      <div className="text-xs text-text-muted">
        {filtered.length} de {documents.length} documento
        {documents.length === 1 ? "" : "s"}
      </div>
    </div>
  );
}
