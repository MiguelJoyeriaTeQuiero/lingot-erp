"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  format,
  getISOWeek,
  getYear,
  startOfISOWeek,
  endOfISOWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { DocumentRow } from "@/lib/supabase/typed";

type Period = "dia" | "semana" | "mes" | "anio";

interface Group {
  key: string;
  label: string;
  sublabel?: string;
  docs: DocumentRow[];
  total: number;
  igic: number;
  subtotal: number;
}

const statusToBadge: Record<string, BadgeVariant> = {
  emitido: "emitido",
  pagado: "pagado",
  vencido: "vencido",
  convertido: "convertido",
  rectificada: "rectificada",
};

const PERIODS: { key: Period; label: string }[] = [
  { key: "dia",    label: "Por día" },
  { key: "semana", label: "Por semana" },
  { key: "mes",    label: "Por mes" },
  { key: "anio",   label: "Por año" },
];

function groupKey(date: Date, period: Period): string {
  switch (period) {
    case "dia":    return format(date, "yyyy-MM-dd");
    case "semana": return `${getYear(date)}-W${String(getISOWeek(date)).padStart(2, "0")}`;
    case "mes":    return format(date, "yyyy-MM");
    case "anio":   return format(date, "yyyy");
  }
}

function groupLabel(date: Date, period: Period): { label: string; sublabel?: string } {
  switch (period) {
    case "dia":
      return {
        label: format(date, "d 'de' MMMM yyyy", { locale: es }),
        sublabel: format(date, "EEEE", { locale: es }),
      };
    case "semana": {
      const s = startOfISOWeek(date);
      const e = endOfISOWeek(date);
      return {
        label: `Semana ${getISOWeek(date)} · ${getYear(date)}`,
        sublabel: `${format(s, "d MMM", { locale: es })} – ${format(e, "d MMM", { locale: es })}`,
      };
    }
    case "mes":
      return {
        label: format(date, "MMMM yyyy", { locale: es }),
      };
    case "anio":
      return { label: format(date, "yyyy") };
  }
}

export function LibroView({
  docs,
  clientMap,
}: {
  docs: DocumentRow[];
  clientMap: Record<string, string>;
}) {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("mes");

  const { groups, grandTotal, grandIgic, grandSubtotal } = useMemo(() => {
    const map = new Map<string, Group>();

    for (const doc of docs) {
      const date = new Date(doc.issue_date);
      const key  = groupKey(date, period);

      if (!map.has(key)) {
        const { label, sublabel } = groupLabel(date, period);
        map.set(key, { key, label, sublabel, docs: [], total: 0, igic: 0, subtotal: 0 });
      }
      const g = map.get(key)!;
      g.docs.push(doc);
      g.total    += Number(doc.total ?? 0);
      g.igic     += Number(doc.igic_total ?? 0);
      g.subtotal += Number(doc.subtotal ?? 0);
    }

    const groups = [...map.values()];
    const grandTotal    = groups.reduce((s, g) => s + g.total, 0);
    const grandIgic     = groups.reduce((s, g) => s + g.igic, 0);
    const grandSubtotal = groups.reduce((s, g) => s + g.subtotal, 0);

    return { groups, grandTotal, grandIgic, grandSubtotal };
  }, [docs, period]);

  return (
    <div className="space-y-8">

      {/* Resumen acumulado */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Base imponible acumulada", value: grandSubtotal },
          { label: "IGIC acumulado",           value: grandIgic },
          { label: "Total facturado",          value: grandTotal, primary: true },
        ].map((s) => (
          <div
            key={s.label}
            className={
              "border px-6 py-5 " +
              (s.primary
                ? "border-primary/30 bg-surface-raised"
                : "border-border bg-surface")
            }
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-muted">
              {s.label}
            </div>
            <div
              className={
                "mt-2 font-editorial text-3xl leading-none tabular tracking-tight " +
                (s.primary ? "text-primary" : "text-text")
              }
            >
              {formatCurrency(s.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Selector de período */}
      <div className="flex items-center gap-1 border-b border-border pb-0">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            className={
              "relative px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] transition-colors " +
              (period === p.key
                ? "text-primary after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-gold"
                : "text-text-muted hover:text-primary")
            }
          >
            {p.label}
          </button>
        ))}
        <div className="ml-auto font-mono text-[10px] text-text-dim">
          {docs.length} facturas
        </div>
      </div>

      {/* Grupos */}
      {groups.length === 0 ? (
        <div className="py-20 text-center font-mono text-sm text-text-muted">
          Sin facturas emitidas todavía.
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map((g) => (
            <section key={g.key}>
              {/* Cabecera del período */}
              <div className="mb-3 flex items-end justify-between border-b-2 border-primary/70 pb-2">
                <div>
                  <h2 className="font-display text-xl font-medium capitalize text-primary">
                    {g.label}
                  </h2>
                  {g.sublabel && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">
                      {g.sublabel}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">
                    {g.docs.length} factura{g.docs.length !== 1 ? "s" : ""}
                  </div>
                  <div className="font-editorial text-2xl tabular text-primary">
                    {formatCurrency(g.total)}
                  </div>
                  {g.igic > 0 && (
                    <div className="font-mono text-[10px] text-text-muted">
                      IGIC {formatCurrency(g.igic)}
                    </div>
                  )}
                </div>
              </div>

              {/* Filas de facturas */}
              <div className="divide-y divide-hairline">
                {g.docs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => router.push(`/documentos/${doc.id}`)}
                    className="grid cursor-pointer grid-cols-12 items-center gap-4 px-2 py-3.5 transition-colors hover:bg-surface-sunken/50"
                  >
                    <div className="col-span-1 font-mono text-[10px] tabular text-text-dim">
                      {format(new Date(doc.issue_date), "dd/MM")}
                    </div>
                    <div className="col-span-3">
                      <span className="font-mono text-[12px] font-medium tracking-wider text-gold-deep">
                        {doc.code ?? <span className="italic text-text-dim">borrador</span>}
                      </span>
                    </div>
                    <div className="col-span-4 truncate text-sm text-text">
                      {clientMap[doc.client_id] ?? "—"}
                    </div>
                    <div className="col-span-2">
                      <Badge variant={statusToBadge[doc.status] ?? "neutral"} />
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="font-mono text-[13px] tabular text-primary">
                        {formatCurrency(Number(doc.total ?? 0))}
                      </span>
                      {Number(doc.igic_total) > 0 && (
                        <div className="font-mono text-[10px] text-text-dim">
                          +{formatCurrency(Number(doc.igic_total))} IGIC
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
