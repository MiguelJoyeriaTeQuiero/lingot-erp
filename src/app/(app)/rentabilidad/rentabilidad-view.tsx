"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, RotateCcw } from "lucide-react";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { SaleRow } from "./page";

interface Props {
  rows: SaleRow[];
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function RentabilidadView({ rows }: Props) {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<string>("all");

  // Meses disponibles (YYYY-MM) derivados de las ventas, más recientes primero.
  const months = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const r of rows) {
      const key = r.issue_date.slice(0, 7); // YYYY-MM
      if (!byKey.has(key)) {
        byKey.set(
          key,
          capitalize(
            new Date(r.issue_date).toLocaleDateString("es-ES", {
              month: "long",
              year: "numeric",
            })
          )
        );
      }
    }
    return [...byKey.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);

  const filtered = useMemo(() => {
    let base = rows;
    if (period !== "all") {
      base = base.filter((r) => r.issue_date.slice(0, 7) === period);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      base = base.filter(
        (r) =>
          r.product_name.toLowerCase().includes(q) ||
          (r.product_sku ?? "").toLowerCase().includes(q) ||
          (r.client_name ?? "").toLowerCase().includes(q) ||
          (r.doc_code ?? "").toLowerCase().includes(q)
      );
    }
    return base;
  }, [rows, search, period]);

  const totalRevenue = filtered.reduce((s, r) => s + r.revenue, 0);
  const totalCost = filtered.reduce((s, r) => s + r.total_cost, 0);
  const totalProfit = filtered.reduce((s, r) => s + r.profit, 0);
  const globalMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Buscar producto, cliente, factura…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-primary placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-gold/50"
        />
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-gold/50"
          aria-label="Filtrar por mes"
        >
          <option value="all">Todos los periodos</option>
          {months.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        {period !== "all" && (
          <button
            type="button"
            onClick={() => setPeriod("all")}
            className="text-xs uppercase tracking-widest text-text-muted transition-colors hover:text-primary"
          >
            Quitar filtro
          </button>
        )}
      </div>

      <div className="rounded-md border border-border bg-surface">
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-text-muted">
            Sin resultados.
          </div>
        ) : (
          <Table className="min-w-[1020px]">
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
                  <TR
                    key={row.id}
                    className={row.is_rectification ? "bg-purple-50/40" : undefined}
                  >
                    <TD className="text-text-muted">{formatDate(row.issue_date)}</TD>
                    <TD>
                      <div className="flex items-center gap-1.5">
                        {row.is_rectification && (
                          <RotateCcw className="h-3 w-3 shrink-0 text-purple-600" strokeWidth={2} aria-label="Rectificativa" />
                        )}
                        <Link
                          href={`/documentos/${row.doc_id}`}
                          className="font-mono text-xs text-primary underline-offset-2 hover:underline"
                        >
                          {row.doc_code ?? "—"}
                        </Link>
                      </div>
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
                      {formatCurrency(Math.abs(pvpPerUnit))}
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
                      <MarginCell marginPct={marginPct} profit={row.profit} isRectification={row.is_rectification} />
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

function MarginCell({
  marginPct,
  profit,
  isRectification,
}: {
  marginPct: number | null;
  profit: number;
  isRectification?: boolean;
}) {
  if (isRectification) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-purple-600">
        <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
        Rectif.
      </span>
    );
  }
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
