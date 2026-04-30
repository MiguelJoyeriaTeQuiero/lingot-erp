import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface LotProfitRow {
  id: string;
  order_date: string;
  supplier_name: string | null;
  quantity_total: number;
  quantity_remaining: number;
  cost_per_gram: number;
  cost_per_unit: number;
  qtySold: number;
  revenue: number;   // suma de line_subtotal (sin IGIC)
  cogs: number;      // suma de quantity × unit_cost
}

interface Props {
  rows: LotProfitRow[];
}

export function ProfitabilitySection({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <section className="space-y-4">
        <h2 className="font-display text-sm uppercase tracking-widest text-text-muted">
          Rentabilidad por lotes
        </h2>
        <div className="rounded-md border border-border bg-surface px-4 py-10 text-center text-sm text-text-muted">
          Aún no hay lotes registrados. Crea un pedido de reposición para empezar.
        </div>
      </section>
    );
  }

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCogs = rows.reduce((s, r) => s + r.cogs, 0);
  const totalQtySold = rows.reduce((s, r) => s + r.qtySold, 0);

  return (
    <section className="space-y-4">
      <h2 className="font-display text-sm uppercase tracking-widest text-text-muted">
        Rentabilidad por lotes
      </h2>
      <div className="rounded-md border border-border bg-surface">
        <Table className="min-w-[720px]">
          <THead>
            <TR>
              <TH>Fecha</TH>
              <TH>Proveedor</TH>
              <TH className="text-right">Coste/u</TH>
              <TH className="text-right">Comprado</TH>
              <TH className="text-right">Vendido</TH>
              <TH className="text-right">Disponible</TH>
              <TH className="text-right">Ingreso</TH>
              <TH className="text-right">Coste</TH>
              <TH className="text-right">Margen</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((row) => {
              const gross = row.revenue - row.cogs;
              const marginPct =
                row.revenue > 0 && row.cogs > 0
                  ? (gross / row.revenue) * 100
                  : null;

              return (
                <TR key={row.id}>
                  <TD className="text-text-muted">{formatDate(row.order_date)}</TD>
                  <TD className="text-text-muted">{row.supplier_name ?? "—"}</TD>
                  <TD className="text-right font-mono text-sm">
                    {formatCurrency(Number(row.cost_per_unit))}
                  </TD>
                  <TD className="text-right tabular-nums">{row.quantity_total}</TD>
                  <TD className="text-right tabular-nums">
                    {row.qtySold > 0 ? row.qtySold : <span className="text-text-dim">0</span>}
                  </TD>
                  <TD className="text-right tabular-nums">
                    <span className={Number(row.quantity_remaining) === 0 ? "text-text-dim" : ""}>
                      {row.quantity_remaining}
                    </span>
                  </TD>
                  <TD className="text-right font-mono text-sm">
                    {row.revenue > 0 ? formatCurrency(row.revenue) : <span className="text-text-dim">—</span>}
                  </TD>
                  <TD className="text-right font-mono text-sm">
                    {row.cogs > 0 ? formatCurrency(row.cogs) : <span className="text-text-dim">—</span>}
                  </TD>
                  <TD className="text-right">
                    <MarginCell marginPct={marginPct} gross={gross} />
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>

        {/* Totales */}
        {totalQtySold > 0 && (
          <div className="flex items-center justify-end gap-6 border-t border-border px-4 py-3">
            <span className="text-xs uppercase tracking-widest text-text-muted">
              Total vendido
            </span>
            <span className="font-mono text-sm tabular-nums">
              Ingreso: {formatCurrency(totalRevenue)}
            </span>
            <span className="font-mono text-sm tabular-nums">
              Coste: {formatCurrency(totalCogs)}
            </span>
            <MarginCell
              marginPct={totalRevenue > 0 && totalCogs > 0 ? ((totalRevenue - totalCogs) / totalRevenue) * 100 : null}
              gross={totalRevenue - totalCogs}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function MarginCell({ marginPct, gross }: { marginPct: number | null; gross: number }) {
  if (marginPct === null) {
    return <span className="text-xs text-text-dim">—</span>;
  }
  if (Math.abs(gross) < 0.005) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-text-muted">
        <Minus className="h-3.5 w-3.5" strokeWidth={2} />
        0%
      </span>
    );
  }
  if (gross > 0) {
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
