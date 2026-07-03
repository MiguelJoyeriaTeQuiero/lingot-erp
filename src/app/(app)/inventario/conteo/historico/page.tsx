import Link from "next/link";
import { ArrowLeft, ScanLine, CheckCircle2, MinusCircle, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { createRawAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/require-role";

export const dynamic = "force-dynamic";

interface CountRow {
  id: string;
  counted_at: string;
  counted_by_name: string | null;
  lines_total: number;
  diff_count: number;
  total_delta: number;
  units_over: number;
  units_short: number;
  notes: string | null;
}

interface CountLineRow {
  id: string;
  count_id: string;
  product_name: string;
  product_sku: string | null;
  expected: number;
  counted: number;
  delta: number;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function HistoricoConteosPage() {
  await requireRole(["admin", "contabilidad"]);
  const admin = createRawAdminClient();

  const { data: countsData } = await admin
    .from("inventory_counts")
    .select(
      "id, counted_at, counted_by_name, lines_total, diff_count, total_delta, units_over, units_short, notes"
    )
    .order("counted_at", { ascending: false })
    .limit(200);

  const counts = (countsData ?? []) as CountRow[];

  const linesByCount = new Map<string, CountLineRow[]>();
  if (counts.length > 0) {
    const { data: linesData } = await admin
      .from("inventory_count_lines")
      .select("id, count_id, product_name, product_sku, expected, counted, delta")
      .in(
        "count_id",
        counts.map((c) => c.id)
      );
    for (const line of (linesData ?? []) as CountLineRow[]) {
      const arr = linesByCount.get(line.count_id) ?? [];
      arr.push(line);
      linesByCount.set(line.count_id, arr);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operación · 03 · Conteo"
        title="Histórico de conteos"
        description="Registro de cada conteo de inventario realizado: fecha, usuario y diferencias detectadas por producto."
        action={
          <Link href="/inventario/conteo">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              Volver al conteo
            </Button>
          </Link>
        }
      />

      {counts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border border-dashed border-border py-20 text-center">
          <ScanLine className="h-8 w-8 text-text-dim" strokeWidth={1} />
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-text-dim">
            Aún no se ha registrado ningún conteo
          </div>
          <div className="text-sm text-text-muted">
            Los conteos que apliques en la herramienta de conteo aparecerán aquí.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {counts.map((count) => {
            const lines = linesByCount.get(count.id) ?? [];
            return (
              <details
                key={count.id}
                className="group border border-border bg-surface-raised shadow-paper"
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 transition-colors hover:bg-surface-sunken/40">
                  <span className="font-mono text-[13px] tabular tracking-wide text-primary">
                    {fmtDateTime(count.counted_at)}
                  </span>
                  <span className="text-sm text-text-muted">
                    {count.counted_by_name ?? "—"}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-dim">
                    {count.lines_total} pieza{count.lines_total !== 1 ? "s" : ""}
                  </span>

                  <div className="ml-auto flex flex-wrap items-center gap-3">
                    {count.diff_count === 0 ? (
                      <span className="flex items-center gap-1.5 font-mono text-[11px] text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                        Sin diferencias
                      </span>
                    ) : (
                      <>
                        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-dim">
                          {count.diff_count} con diferencia
                        </span>
                        {Number(count.units_short) > 0 && (
                          <span className="flex items-center gap-1.5 font-mono text-[11px] text-danger">
                            <MinusCircle className="h-3.5 w-3.5" strokeWidth={2} />
                            −{Number(count.units_short)}
                          </span>
                        )}
                        {Number(count.units_over) > 0 && (
                          <span className="flex items-center gap-1.5 font-mono text-[11px] text-gold-deep">
                            <AlertCircle className="h-3.5 w-3.5" strokeWidth={2} />
                            +{Number(count.units_over)}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </summary>

                {count.notes && (
                  <div className="border-t border-hairline px-5 py-3 text-sm italic text-text-muted">
                    {count.notes}
                  </div>
                )}

                <div className="overflow-x-auto border-t border-hairline">
                  <table className="min-w-[560px] w-full text-sm">
                    <thead className="border-b border-border bg-surface-sunken/30">
                      <tr>
                        <th className="px-5 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
                          Producto
                        </th>
                        <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
                          SKU
                        </th>
                        <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
                          Sistema
                        </th>
                        <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
                          Contado
                        </th>
                        <th className="px-5 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
                          Diferencia
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {lines
                        .slice()
                        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
                        .map((line) => {
                          const delta = Number(line.delta);
                          return (
                            <tr key={line.id}>
                              <td className="px-5 py-2.5 text-primary">
                                {line.product_name}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-[12px] text-gold-deep">
                                {line.product_sku ?? "—"}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-[13px] tabular text-text-muted">
                                {Number(line.expected)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-[13px] tabular text-primary">
                                {Number(line.counted)}
                              </td>
                              <td className="px-5 py-2.5 text-right">
                                <span
                                  className={
                                    "font-mono text-[13px] tabular font-medium " +
                                    (delta === 0
                                      ? "text-text-muted"
                                      : delta > 0
                                      ? "text-gold-deep"
                                      : "text-danger")
                                  }
                                >
                                  {delta > 0 ? `+${delta}` : delta}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
