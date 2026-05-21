"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { updateReservationStatusAction } from "./actions";
import type { ReservationRow } from "./page";

const STATUSES = ["pendiente", "confirmada", "entregada", "cancelada"] as const;
type Status = (typeof STATUSES)[number];
type FilterStatus = "all" | Status;

const statusConfig: Record<
  Status,
  { label: string; bg: string; color: string; border: string }
> = {
  pendiente: {
    label: "Pendiente",
    bg: "rgba(184,138,61,0.08)",
    color: "#8b6628",
    border: "rgba(184,138,61,0.30)",
  },
  confirmada: {
    label: "Confirmada",
    bg: "rgba(10,55,70,0.07)",
    color: "var(--color-primary)",
    border: "rgba(10,55,70,0.20)",
  },
  entregada: {
    label: "Entregada",
    bg: "rgba(var(--color-success-rgb, 30,100,60),0.07)",
    color: "var(--color-success, #1a6040)",
    border: "rgba(30,100,60,0.20)",
  },
  cancelada: {
    label: "Cancelada",
    bg: "rgba(var(--color-danger-rgb, 177,67,56),0.07)",
    color: "var(--color-danger)",
    border: "rgba(177,67,56,0.25)",
  },
};

interface Props {
  rows: ReservationRow[];
}

export function ReservasClient({ rows }: Props) {
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filtered = useMemo(
    () =>
      filter === "all" ? rows : rows.filter((r) => r.status === filter),
    [rows, filter]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    STATUSES.forEach((s) => {
      c[s] = rows.filter((r) => r.status === s).length;
    });
    return c;
  }, [rows]);

  async function handleStatusChange(id: string, status: string) {
    const result = await updateReservationStatusAction(id, status);
    if ("error" in result) {
      alert(result.error);
      return;
    }
    startTransition(() => {
      router.refresh();
    });
  }

  const filterLabels: Record<FilterStatus, string> = {
    all: "Todas",
    pendiente: "Pendientes",
    confirmada: "Confirmadas",
    entregada: "Entregadas",
    cancelada: "Canceladas",
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATUSES.map((s) => {
          const cfg = statusConfig[s];
          return (
            <div
              key={s}
              className="rounded-md border border-border bg-surface px-4 py-3"
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-text-dim">
                {cfg.label}
              </p>
              <p
                className="mt-1 font-display text-[28px] font-medium leading-none tabular-nums"
                style={{ color: cfg.color }}
              >
                {counts[s] ?? 0}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {(["all", ...STATUSES] as FilterStatus[]).map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="rounded-full border px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] transition-all duration-200"
              style={{
                borderColor: active ? "var(--color-gold)" : "var(--color-border)",
                background: active ? "var(--color-gold)" : "transparent",
                color: active ? "var(--color-primary-deep)" : "var(--color-text-muted)",
              }}
            >
              {filterLabels[f]}
              <span className="ml-1.5 opacity-60">{counts[f] ?? rows.length}</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-text-muted">
            Sin reservas en esta categoría.
          </div>
        ) : (
          <table className="w-full min-w-[900px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border">
                {[
                  "Fecha",
                  "Cliente",
                  "Email",
                  "Producto",
                  "Cant.",
                  "Precio",
                  "Teléfono",
                  "Nota",
                  "Estado",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-[0.28em] text-text-dim"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const cfg = statusConfig[r.status as Status] ?? statusConfig.pendiente;
                return (
                  <tr
                    key={r.id}
                    className="border-b border-border last:border-0 hover:bg-surface-raised/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-[11px] text-text-muted">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-primary">
                      {r.customer_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-text-muted">
                      {r.customer_email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-primary">{r.product_name}</span>
                      {r.product_sku && (
                        <span className="ml-1.5 font-mono text-[10px] text-text-dim">
                          {r.product_sku}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-text-muted">
                      {r.quantity}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] tabular-nums text-primary">
                      {formatCurrency(Number(r.price_snapshot))}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-text-muted">
                      {r.phone ?? "—"}
                    </td>
                    <td
                      className="max-w-[160px] px-4 py-3 text-[12px] text-text-muted"
                      title={r.note ?? ""}
                    >
                      <span className="line-clamp-2">{r.note ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        defaultValue={r.status}
                        disabled={isPending}
                        onChange={(e) =>
                          handleStatusChange(r.id, e.target.value)
                        }
                        className="rounded-none border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] focus:outline-none focus:ring-1 focus:ring-gold/50 disabled:opacity-50"
                        style={{
                          background: cfg.bg,
                          color: cfg.color,
                          borderColor: cfg.border,
                        }}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {statusConfig[s].label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
