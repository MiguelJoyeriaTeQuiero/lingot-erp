import { createRawAdminClient } from "@/lib/supabase/admin";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ReservationRow {
  id: string;
  created_at: string;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  price_snapshot: number;
  status: string;
  note: string | null;
}

const statusConfig: Record<
  string,
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
    color: "#1e5468",
    border: "rgba(10,55,70,0.20)",
  },
  entregada: {
    label: "Entregada",
    bg: "rgba(30,100,60,0.07)",
    color: "#1a6040",
    border: "rgba(30,100,60,0.20)",
  },
  cancelada: {
    label: "Cancelada",
    bg: "rgba(177,67,56,0.07)",
    color: "#b14338",
    border: "rgba(177,67,56,0.25)",
  },
};

interface Props {
  userId: string;
}

export async function MisReservas({ userId }: Props) {
  const admin = createRawAdminClient();

  const { data: reservations } = await admin
    .from("reservations")
    .select(
      "id, created_at, product_name, product_sku, quantity, price_snapshot, status, note"
    )
    .eq("customer_id", userId)
    .order("created_at", { ascending: false });

  const rows = (reservations ?? []) as ReservationRow[];

  return (
    <div>
      {/* Section title */}
      <div className="mb-8 flex items-center gap-4">
        <p
          className="font-mono text-[10px] uppercase tracking-[0.4em]"
          style={{ color: "rgba(10,37,48,0.40)" }}
        >
          Mis reservas
        </p>
        <div
          className="h-px flex-1"
          style={{
            background:
              "linear-gradient(to right, rgba(184,138,61,0.30), transparent)",
          }}
        />
        {rows.length > 0 && (
          <span
            className="font-mono text-[9px] uppercase tracking-[0.3em]"
            style={{ color: "rgba(184,138,61,0.60)" }}
          >
            {rows.length} {rows.length === 1 ? "reserva" : "reservas"}
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <div
          className="py-10 text-center"
          style={{
            border: "1px solid rgba(10,37,48,0.07)",
            background: "rgba(255,255,255,0.5)",
          }}
        >
          <p
            className="font-mono text-[10px] uppercase tracking-[0.35em]"
            style={{ color: "rgba(10,37,48,0.25)" }}
          >
            Sin reservas todavía
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table
            className="w-full border-collapse text-[13px]"
            style={{ color: "#0a2530" }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid rgba(10,37,48,0.08)",
                }}
              >
                {["Fecha", "Producto", "Cant.", "Precio", "Estado"].map(
                  (h) => (
                    <th
                      key={h}
                      className="pb-3 pr-6 text-left font-mono text-[9px] uppercase tracking-[0.3em]"
                      style={{ color: "rgba(10,37,48,0.40)" }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const stKey = (r.status in statusConfig ? r.status : "pendiente") as keyof typeof statusConfig;
                const st = statusConfig[stKey]!;
                return (
                  <tr
                    key={r.id}
                    style={{ borderBottom: "1px solid rgba(10,37,48,0.05)" }}
                  >
                    <td
                      className="py-3 pr-6 font-mono text-[11px]"
                      style={{ color: "rgba(10,37,48,0.45)" }}
                    >
                      {formatDate(r.created_at)}
                    </td>
                    <td className="py-3 pr-6">
                      <span className="font-medium" style={{ color: "#0a2530" }}>
                        {r.product_name}
                      </span>
                      {r.product_sku && (
                        <span
                          className="ml-2 font-mono text-[10px]"
                          style={{ color: "rgba(10,37,48,0.30)" }}
                        >
                          {r.product_sku}
                        </span>
                      )}
                      {r.note && (
                        <p
                          className="mt-0.5 text-[11px]"
                          style={{ color: "rgba(10,37,48,0.40)" }}
                        >
                          {r.note}
                        </p>
                      )}
                    </td>
                    <td
                      className="py-3 pr-6 font-mono text-[12px] tabular-nums"
                      style={{ color: "rgba(10,37,48,0.55)" }}
                    >
                      {r.quantity}
                    </td>
                    <td
                      className="py-3 pr-6 font-mono text-[12px] tabular-nums"
                      style={{ color: "#9a7230" }}
                    >
                      {formatCurrency(Number(r.price_snapshot))}
                    </td>
                    <td className="py-3">
                      <span
                        className="inline-block px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em]"
                        style={{
                          background: st.bg,
                          color: st.color,
                          border: `1px solid ${st.border}`,
                        }}
                      >
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
