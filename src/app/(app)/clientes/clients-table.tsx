"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { PriceTierBadge } from "@/components/shared/price-tier-badge";
import type { Database } from "@/types/database.types";

type Client = Database["public"]["Tables"]["clients"]["Row"];

interface ClientsTableProps {
  clients: Client[];
}

export function ClientsTable({ clients }: ClientsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "particular" | "empresa">(
    "all"
  );
  const [tierFilter, setTierFilter] = useState<
    "all" | "A" | "B" | "C" | "especial"
  >("all");
  const [showInactive, setShowInactive] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (!showInactive && !c.active) return false;
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (tierFilter !== "all" && c.price_tier !== tierFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.tax_id ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.city ?? "").toLowerCase().includes(q)
      );
    });
  }, [clients, search, typeFilter, tierFilter, showInactive]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_180px_auto]">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          />
          <Input
            placeholder="Buscar por nombre, NIF, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value as typeof typeFilter)
          }
        >
          <option value="all">Todos los tipos</option>
          <option value="particular">Particular</option>
          <option value="empresa">Empresa</option>
        </Select>
        <Select
          value={tierFilter}
          onChange={(e) =>
            setTierFilter(e.target.value as typeof tierFilter)
          }
        >
          <option value="all">Todas las tarifas</option>
          <option value="A">Tarifa A</option>
          <option value="B">Tarifa B</option>
          <option value="C">Tarifa C</option>
          <option value="especial">Tarifa Especial</option>
        </Select>
        <label className="flex items-center gap-2 text-xs text-text-muted">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-4 w-4 rounded border-border bg-surface-raised accent-gold"
          />
          Incluir inactivos
        </label>
      </div>

      <div className="rounded-md border border-border bg-surface">
        <Table>
          <THead>
            <TR>
              <TH>Nombre</TH>
              <TH>Tipo</TH>
              <TH>NIF / CIF</TH>
              <TH>Email</TH>
              <TH>Teléfono</TH>
              <TH>Tarifa</TH>
              <TH>Estado</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.length === 0 ? (
              <TR>
                <TD colSpan={7} className="py-10 text-center text-text-muted">
                  No se han encontrado clientes con esos criterios.
                </TD>
              </TR>
            ) : (
              filtered.map((c) => (
                <TR
                  key={c.id}
                  onClick={() => router.push(`/clientes/${c.id}`)}
                  className="cursor-pointer"
                >
                  <TD className="font-medium text-text">{c.name}</TD>
                  <TD>
                    <Badge variant="neutral">
                      {c.type === "empresa" ? "Empresa" : "Particular"}
                    </Badge>
                  </TD>
                  <TD className="text-text-muted">{c.tax_id ?? "—"}</TD>
                  <TD className="text-text-muted">{c.email ?? "—"}</TD>
                  <TD className="text-text-muted">{c.phone ?? "—"}</TD>
                  <TD>
                    <PriceTierBadge tier={c.price_tier} />
                  </TD>
                  <TD>
                    {c.active ? (
                      <Badge variant="pagado">Activo</Badge>
                    ) : (
                      <Badge variant="cancelado">Inactivo</Badge>
                    )}
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </div>

      <div className="text-xs text-text-muted">
        {filtered.length} de {clients.length} cliente
        {clients.length === 1 ? "" : "s"}
      </div>
    </div>
  );
}
