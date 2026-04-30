"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { SaleRow } from "./page";

interface Props {
  rows: SaleRow[];
}

export function RentabilidadView({ rows }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.product_name.toLowerCase().includes(q) ||
        (r.product_sku ?? "").toLowerCase().includes(q) ||
        (r.client_name ?? "").toLowerCase().includes(q) ||
        (r.doc_code ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totalRevenue = filtered.reduce((s, r) => s + r.revenue, 0);
  const totalCost = filtered.reduce((s, r) => s + r.total_cost, 0);
  const totalProfit = filtered.reduce((s, r) => s + r.profit, 0);
  const globalMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Buscar producto, cliente, factura…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-primary placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-gold/50"
        />
      </div>

      <div className="rounded-md border border-border bg-surface">
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-text-muted">
            Sin resultados.
          </div>
        ) : (
          <Table className="min-w-[900px]">
            <THead>
              <TR>
                <TH>Fecha</TH>
                <TH>Factura</TH>
                <TH>Cliente</TH>
                <TH>Producto</TH>
                <TH className="text-right">Cant.</TH>
                <TH className="text-right">PVP/u</TH>
                <TH className="text-right">Coste/u</TH>
                <TH className="text-right">Beneficio</TH>
                <TH className="text-right">Margen</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((row) => {
                const pvpPerUnit = row.quantity > 0 ? row.revenue / row.quantity : 0;
                const profitPerUnit = pvpPerUnit - row.cost_per_unit;
                const marginPct = pvpPerUnit > 0 ? (profitPerUnit / pvpPerUnit) * 100 : null;
                return (
                  <TR key={row.id}>
                    <TD className="text-text-muted">{formatDate(row.issue_date)}</TD>
                    <TD>
                      <Link
                        href={`/documentos/${row.doc_id}`}
                        className="font-mono text-xs text-primary underline-offset-2 hover:underline"
                      >
                        {row.doc_code ?? "—"}
                      </Link>
                    </TD>
                    <TD className="text-text-muted">{row.client_name ?? "—"}</TD>
                    <TD>
                      <span className="text-primary">{row.product_name}</span>
                      {row.product_sku && (
                        <span className="ml-1.5 font-mono text-[10px] text-text-dim">
                          {row.product_sku}
                        </span>
                      )}
                    </TD>
                    <TD className="text-right tabular-nums">{row.quantity}</TD>
                    <TD className="text-right font-mono text-sm">
                      {formatCurrency(pvpPerUnit)}
                    </TD>
                    <TD className="text-right font-mono text-sm text-text-muted">
                      {formatCurrency(row.cost_per_unit)}
                    </TD>
                    <TD className="text-right font-mono text-sm">
                      <span className={row.profit >= 0 ? "text-success" : "text-danger"}>
                        {row.profit >= 0 ? "+" : ""}
                        {formatCurrency(row.profit)}
                      </span>
                    </TD>
                    <TD className="text-right">
                      <MarginCell marginPct={marginPct} profit={row.profit} />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-6 border-t border-border px-4 py-3">
            <span className="text-xs uppercase tracking-widest text-text-muted">
              Total ({filtered.length} ventas)
            </span>
            <span className="font-mono text-sm tabular-nums text-text-muted">
              Ingreso: {formatCurrency(totalRevenue)}
            </span>
            <span className="font-mono text-sm tabular-nums text-text-muted">
              Coste: {formatCurrency(totalCost)}
            </span>
            <span className={`font-mono text-sm tabular-nums font-medium ${totalProfit >= 0 ? "text-success" : "text-danger"}`}>
              {totalProfit >= 0 ? "+" : ""}{formatCurrency(totalProfit)}
            </span>
            <MarginCell marginPct={globalMargin} profit={totalProfit} />
          </div>
        )}
      </div>
    </div>
  );
}

function MarginCell({ marginPct, profit }: { marginPct: number | null; profit: number }) {
  if (marginPct === null) return <span className="text-xs text-text-dim">—</span>;
  if (Math.abs(profit) < 0.005) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-text-muted">
        <Minus className="h-3.5 w-3.5" strokeWidth={2} /> 0%
      </span>
    );
  }
  if (profit > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-success">
        <TrendingUp className="h-3.5 w-3.5" strokeWidth={2} />
        +{marginPct.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-danger">
      <TrendingDown className="h-3.5 w-3.5" strokeWidth={2} />
      {marginPct.toFixed(1)}%
    </span>
  );
}
