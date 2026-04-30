import Link from "next/link";
import { ArrowUpRight, TrendingUp, Sparkle, ScrollText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { createTypedClient } from "@/lib/supabase/typed";
import { getLatestSpots } from "@/lib/metal-prices";
import { formatCurrency, formatDate } from "@/lib/utils";
import { requireRole } from "@/lib/require-role";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireRole(["admin"]);
  const supabase = createTypedClient();

  const [docsRes, clientsRes, productsRes, spots, lotsRes, linesRes] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60),
    supabase.from("clients").select("*").limit(500),
    supabase.from("products").select("*").limit(500),
    getLatestSpots(),
    supabase.from("stock_lots").select("id, product_id, cost_per_unit"),
    supabase
      .from("document_lines")
      .select("lot_id, quantity, line_subtotal, document_id"),
  ]);

  const documents = docsRes.data ?? [];
  const clients = clientsRes.data ?? [];
  const products = productsRes.data ?? [];
  const allLots = lotsRes.data ?? [];
  const allLines = linesRes.data ?? [];

  // ── Rentabilidad ─────────────────────────────────────────────────────────
  const emittedDocIds = new Set(
    documents
      .filter((d) => d.status !== "borrador" && d.status !== "cancelado")
      .map((d) => d.id)
  );
  const lotMap = new Map(allLots.map((l) => [l.id, l]));
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Acumular por producto
  type ProfitEntry = { name: string; revenue: number; cost: number };
  const profitByProduct = new Map<string, ProfitEntry>();

  for (const line of allLines) {
    if (!line.lot_id || !emittedDocIds.has(line.document_id)) continue;
    const lot = lotMap.get(line.lot_id);
    if (!lot) continue;
    const qty = Number(line.quantity);
    const revenue = Number(line.line_subtotal);
    const cost = Number(lot.cost_per_unit) * qty;
    const prod = productMap.get(lot.product_id);
    const name = prod?.name ?? "Otro";
    const prev = profitByProduct.get(lot.product_id) ?? { name, revenue: 0, cost: 0 };
    prev.revenue += revenue;
    prev.cost += cost;
    profitByProduct.set(lot.product_id, prev);
  }

  const profitRows = [...profitByProduct.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  const totalProfitRevenue = profitRows.reduce((s, r) => s + r.revenue, 0);
  const totalProfitCost = profitRows.reduce((s, r) => s + r.cost, 0);
  const totalProfit = totalProfitRevenue - totalProfitCost;
  const overallMarginPct =
    totalProfitRevenue > 0 ? (totalProfit / totalProfitRevenue) * 100 : 0;
  const hasProfitData = profitRows.length > 0;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthInvoices = documents.filter(
    (d) =>
      d.doc_type === "factura" &&
      d.status !== "borrador" &&
      d.status !== "cancelado" &&
      new Date(d.issue_date) >= monthStart
  );
  const monthRevenue = monthInvoices.reduce(
    (sum, d) => sum + Number(d.total ?? 0),
    0
  );
  const issuedCount = documents.filter((d) => d.status !== "borrador").length;
  const activeClients = clients.filter((c) => c.active).length;
  const stockValue = products.reduce(
    (sum, p) => sum + Number(p.cost_price ?? 0) * Number(p.stock_current ?? 0),
    0
  );

  const recent = documents.slice(0, 6);

  const statusToBadge: Record<string, BadgeVariant> = {
    borrador: "borrador",
    emitido: "emitido",
    pagado: "pagado",
    vencido: "vencido",
    cancelado: "cancelado",
    convertido: "convertido",
  };

  const sparkPoints = monthInvoices
    .slice()
    .reverse()
    .slice(-12)
    .map((d) => Number(d.total ?? 0));
  const maxSpark = Math.max(...sparkPoints, 1);
  const sparkD = sparkPoints
    .map(
      (v, i) =>
        `${i === 0 ? "M" : "L"}${
          (i / Math.max(sparkPoints.length - 1, 1)) * 100
        },${40 - (v / maxSpark) * 36}`
    )
    .join(" ");

  const stats = [
    {
      eyebrow: "Acumulado",
      hint: "02",
      label: "Documentos",
      value: String(issuedCount).padStart(2, "0"),
      sub: "albaranes y facturas",
    },
    {
      eyebrow: "Cartera",
      hint: "03",
      label: "Clientes activos",
      value: String(activeClients).padStart(2, "0"),
      sub: `de ${clients.length} totales`,
    },
    {
      eyebrow: "Almacén",
      hint: "04",
      label: "Stock valorado",
      value: formatCurrency(stockValue),
      sub: `${products.length} referencias`,
    },
  ];

  return (
    <div className="space-y-16">
      <PageHeader
        eyebrow="Visión · 01"
        title="Dashboard"
        description="Resumen ejecutivo de la actividad comercial. Datos al instante."
      />

      {/* Hero stat — editorial split on paper */}
      <section className="reveal delay-1">
        <div className="grid grid-cols-12 gap-6">
          {/* Hero card */}
          <div className="col-span-12 lg:col-span-7">
            <div className="relative overflow-hidden border border-border bg-surface-raised p-10 shadow-vault">
              {/* corner accent */}
              <span
                aria-hidden
                className="pointer-events-none absolute right-0 top-0 h-40 w-40 bg-gradient-to-br from-gold/15 via-gold/5 to-transparent blur-2xl"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute bottom-0 left-0 h-px w-1/3 bg-gradient-to-r from-gold to-transparent"
              />
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold-deep">
                    Facturación ·{" "}
                    {now
                      .toLocaleDateString("es-ES", { month: "long" })
                      .toUpperCase()}
                  </span>
                  <div className="mt-1 flex items-center gap-2 text-text-muted">
                    <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span className="font-mono text-[11px] tabular tracking-wider">
                      {monthInvoices.length} OPERACIONES
                    </span>
                  </div>
                </div>
                <Link
                  href="/libro"
                  className="group inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-text-muted transition-colors hover:text-primary"
                >
                  Ver libro
                  <ArrowUpRight
                    className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    strokeWidth={1.5}
                  />
                </Link>
              </div>

              <div className="mt-10">
                <div className="flex items-baseline gap-2 sm:gap-3">
                  <span className="font-editorial text-[60px] font-normal leading-[0.85] tracking-[-0.04em] text-primary tabular sm:text-[88px] lg:text-[112px]">
                    {Math.floor(monthRevenue).toLocaleString("es-ES")}
                  </span>
                  <span className="font-editorial text-[28px] italic leading-none text-gold-deep sm:text-[36px] lg:text-[44px]">
                    ,{monthRevenue.toFixed(2).split(".")[1] ?? "00"}
                  </span>
                  <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.3em] text-text-dim sm:ml-2 sm:text-xs">
                    EUR
                  </span>
                </div>
              </div>

              {/* sparkline */}
              <div className="mt-8 flex items-end gap-6">
                <svg
                  viewBox="0 0 100 40"
                  className="h-16 flex-1"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="rgb(184 138 61)"
                        stopOpacity="0.25"
                      />
                      <stop
                        offset="100%"
                        stopColor="rgb(184 138 61)"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>
                  {sparkPoints.length > 1 && (
                    <>
                      <path
                        d={`${sparkD} L100,40 L0,40 Z`}
                        fill="url(#spark)"
                      />
                      <path
                        d={sparkD}
                        fill="none"
                        stroke="rgb(184 138 61)"
                        strokeWidth="1.25"
                        vectorEffect="non-scaling-stroke"
                      />
                    </>
                  )}
                  <line
                    x1="0"
                    y1="40"
                    x2="100"
                    y2="40"
                    stroke="rgb(227 220 203)"
                    strokeWidth="0.5"
                  />
                </svg>
                <div className="text-right">
                  <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-dim">
                    Últimas {sparkPoints.length || 0}
                  </div>
                  <div className="font-mono text-[11px] tabular tracking-wider text-text-muted">
                    operaciones
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side stack */}
          <div className="col-span-12 grid grid-cols-1 gap-6 lg:col-span-5 sm:grid-cols-2 lg:grid-cols-1">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={`group relative border border-border bg-surface-raised p-6 shadow-paper transition-all duration-500 ease-out-expo hover:border-primary/40 hover:shadow-editorial reveal delay-${i + 2}`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold-deep">
                    {s.eyebrow}
                  </span>
                  <span className="font-mono text-[10px] tabular tracking-wider text-text-dim">
                    {s.hint}
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-editorial text-[44px] font-normal leading-none tracking-[-0.03em] text-primary tabular">
                    {s.value}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[12px] tracking-wide text-text-muted">
                    {s.sub}
                  </span>
                  <span className="h-px w-8 bg-gold/60 transition-all duration-500 group-hover:w-12 group-hover:bg-gold" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rentabilidad */}
      {hasProfitData && (
        <section className="reveal delay-2">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold-deep">
                Rentabilidad · 02
              </span>
              <h2 className="mt-2 font-display text-2xl font-medium tracking-tight text-primary">
                Beneficio acumulado
              </h2>
            </div>
            <Link
              href="/rentabilidad"
              className="group inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-text-muted transition-colors hover:text-primary"
            >
              Ver análisis completo
              <ArrowUpRight
                className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                strokeWidth={1.5}
              />
            </Link>
          </div>

          <div className="relative overflow-hidden border border-border bg-surface-raised shadow-vault">
            {/* gold corner glow */}
            <span
              aria-hidden
              className="pointer-events-none absolute right-0 top-0 h-64 w-64 bg-gradient-to-br from-gold/20 via-gold/5 to-transparent blur-3xl"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-0 left-0 h-px w-2/3 bg-gradient-to-r from-gold/60 to-transparent"
            />

            <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
              {/* ── Left: arc gauge ── */}
              <div className="flex flex-col items-center justify-center border-b border-border p-10 lg:border-b-0 lg:border-r">
                <ProfitGauge
                  marginPct={overallMarginPct}
                  profit={totalProfit}
                  revenue={totalProfitRevenue}
                  cost={totalProfitCost}
                />
              </div>

              {/* ── Right: product bars ── */}
              <div className="p-8">
                <div className="mb-6 flex items-center gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-dim">
                    Ingresos vs coste por producto
                  </span>
                  <span className="h-px flex-1 bg-hairline" />
                </div>
                <ProductBars rows={profitRows} />
                <div className="mt-8 flex gap-6">
                  <LegendDot color="gold" label="Beneficio" />
                  <LegendDot color="muted" label="Coste" />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Cotización · sección prominente */}
      <section className="reveal delay-3">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold-deep">
              Mercado · 02
            </span>
            <h2 className="mt-2 font-display text-2xl font-medium tracking-tight text-primary">
              Cotización del metal
            </h2>
          </div>
          <Link
            href="/configuracion"
            className="group inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-text-muted transition-colors hover:text-primary"
          >
            Ajustar margen
            <ArrowUpRight
              className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              strokeWidth={1.5}
            />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <SpotCardLarge
            label="Oro · 24k"
            symbol="XAU"
            accent="gold"
            price={spots.oro?.price_eur_per_g ?? null}
            fetchedAt={spots.oro?.fetched_at ?? null}
          />
          <SpotCardLarge
            label="Plata · .999"
            symbol="XAG"
            accent="silver"
            price={spots.plata?.price_eur_per_g ?? null}
            fetchedAt={spots.plata?.fetched_at ?? null}
          />
        </div>
      </section>

      {/* Operación reciente */}
      <section className="reveal delay-4">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold-deep">
              Bitácora · 03
            </span>
            <h2 className="mt-2 font-display text-2xl font-medium tracking-tight text-primary">
              Operación reciente
            </h2>
          </div>
          <Link
            href="/documentos"
            className="group inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-text-muted transition-colors hover:text-primary"
          >
            Todos los documentos
            <ArrowUpRight
              className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              strokeWidth={1.5}
            />
          </Link>
        </div>

        <div className="border-t-2 border-primary/80">
          {recent.length === 0 ? (
            <div className="flex items-center gap-3 border-b border-hairline px-2 py-12 text-text-muted">
              <ScrollText className="h-4 w-4" strokeWidth={1.5} />
              <span className="text-sm">
                Sin movimientos todavía. Empieza creando tu primer documento.
              </span>
            </div>
          ) : (
            recent.map((doc, i) => {
              const client = clients.find((c) => c.id === doc.client_id);
              return (
                <Link
                  key={doc.id}
                  href={`/documentos/${doc.id}`}
                  className="group flex flex-col gap-2 border-b border-hairline px-2 py-4 transition-colors hover:bg-surface-sunken/60 sm:grid sm:grid-cols-12 sm:items-center sm:gap-4 sm:py-5"
                >
                  <div className="hidden sm:block sm:col-span-1 font-mono text-[11px] tabular tracking-wider text-text-dim">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="flex items-center justify-between sm:block sm:col-span-3">
                    <div className="font-mono text-[12px] tabular tracking-wider text-gold-deep">
                      {doc.code ?? "—"}
                    </div>
                    <div className="mt-0 text-[11px] uppercase tracking-widest text-text-dim sm:mt-0.5">
                      {doc.doc_type}
                    </div>
                  </div>
                  <div className="sm:col-span-4 truncate text-[14px] text-primary">
                    {client?.name ?? "Cliente sin asignar"}
                  </div>
                  <div className="flex items-center justify-between sm:block sm:col-span-2">
                    <Badge variant={statusToBadge[doc.status] ?? "neutral"} />
                    <div className="font-mono text-[13px] tabular tracking-wide text-primary sm:hidden">
                      {formatCurrency(Number(doc.total ?? 0))}
                    </div>
                  </div>
                  <div className="hidden sm:block sm:col-span-2 text-right">
                    <div className="font-mono text-[14px] tabular tracking-wide text-primary">
                      {formatCurrency(Number(doc.total ?? 0))}
                    </div>
                    <div className="text-[11px] text-text-dim">
                      {formatDate(doc.issue_date)}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>

      {/* Brand caption */}
      <section className="reveal delay-5">
        <div className="flex flex-col gap-4 border-t border-border pt-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <Sparkle className="h-3 w-3 text-gold" strokeWidth={1.5} />
            <span className="font-editorial text-[22px] italic leading-none text-text-muted sm:text-[28px]">
              precisión orfebre, gestión cotidiana.
            </span>
          </div>
          <div className="sm:text-right">
            <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-text-dim">
              Lingot · Te Quiero Group · {now.getFullYear()}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Profit gauge (arc SVG) ────────────────────────────────────────────────
function ProfitGauge({
  marginPct,
  profit,
  revenue,
  cost,
}: {
  marginPct: number;
  profit: number;
  revenue: number;
  cost: number;
}) {
  // Semicircle: radius 78, center (100, 100), arc from (22,100) to (178,100)
  const R = 78;
  const cx = 100;
  const cy = 100;
  const arcLen = Math.PI * R; // ≈ 245
  const clamped = Math.max(0, Math.min(100, marginPct));
  const fillLen = (clamped / 100) * arcLen;
  const isPositive = profit >= 0;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <svg viewBox="0 0 200 108" className="w-64 sm:w-72 lg:w-80" aria-hidden>
          <defs>
            <linearGradient id="arcGold" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(184,138,61)" stopOpacity="0.7" />
              <stop offset="100%" stopColor="rgb(200,161,100)" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="arcDanger" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(220,80,80)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="rgb(200,60,60)" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Background track */}
          <path
            d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
            fill="none"
            stroke="rgb(227,220,203)"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Filled arc */}
          {fillLen > 0 && (
            <path
              d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
              fill="none"
              stroke={isPositive ? "url(#arcGold)" : "url(#arcDanger)"}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${fillLen.toFixed(2)} ${arcLen.toFixed(2)}`}
            />
          )}

          {/* Center dot */}
          <circle
            cx={cx}
            cy={cy}
            r="4"
            fill={isPositive ? "rgb(184,138,61)" : "rgb(200,60,60)"}
          />

          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const angle = Math.PI - (pct / 100) * Math.PI;
            const x1 = cx + (R - 14) * Math.cos(angle);
            const y1 = cy - (R - 14) * Math.sin(angle);
            const x2 = cx + (R - 8) * Math.cos(angle);
            const y2 = cy - (R - 8) * Math.sin(angle);
            return (
              <line
                key={pct}
                x1={x1.toFixed(2)}
                y1={y1.toFixed(2)}
                x2={x2.toFixed(2)}
                y2={y2.toFixed(2)}
                stroke="rgb(180,170,150)"
                strokeWidth="1"
              />
            );
          })}
        </svg>

        {/* Centered label inside arc */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <span
            className={
              "font-editorial text-[52px] font-light leading-none tracking-[-0.04em] tabular " +
              (isPositive ? "text-primary" : "text-danger")
            }
          >
            {clamped.toFixed(1)}
            <span className="font-editorial text-[24px] italic text-gold-deep">%</span>
          </span>
          <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.32em] text-text-dim">
            margen neto
          </span>
        </div>
      </div>

      {/* Stats below gauge */}
      <div className="grid w-full max-w-xs grid-cols-3 gap-3 border-t border-hairline pt-6">
        <GaugeStat label="Ingreso" value={revenue} />
        <GaugeStat label="Coste" value={cost} muted />
        <GaugeStat
          label="Beneficio"
          value={profit}
          colored
          positive={isPositive}
        />
      </div>
    </div>
  );
}

function GaugeStat({
  label,
  value,
  muted,
  colored,
  positive,
}: {
  label: string;
  value: number;
  muted?: boolean;
  colored?: boolean;
  positive?: boolean;
}) {
  const fmt = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
  return (
    <div className="text-center">
      <div
        className={
          "font-mono text-[13px] tabular font-medium " +
          (colored
            ? positive
              ? "text-success"
              : "text-danger"
            : muted
            ? "text-text-muted"
            : "text-primary")
        }
      >
        {colored && value > 0 ? "+" : ""}
        {fmt}
      </div>
      <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.28em] text-text-dim">
        {label}
      </div>
    </div>
  );
}

// ── Product bars ──────────────────────────────────────────────────────────
function ProductBars({
  rows,
}: {
  rows: { name: string; revenue: number; cost: number }[];
}) {
  const maxRevenue = Math.max(...rows.map((r) => r.revenue), 1);

  return (
    <div className="space-y-4">
      {rows.map((row) => {
        const profit = row.revenue - row.cost;
        const revenueW = (row.revenue / maxRevenue) * 100;
        const costW = row.revenue > 0 ? (row.cost / row.revenue) * revenueW : 0;
        const profitW = revenueW - costW;
        const marginPct =
          row.revenue > 0 ? ((profit / row.revenue) * 100).toFixed(1) : "—";
        const isPos = profit >= 0;
        const shortName =
          row.name.length > 22 ? row.name.slice(0, 20) + "…" : row.name;

        return (
          <div key={row.name} className="group">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-[12px] tracking-wide text-text-muted transition-colors group-hover:text-primary">
                {shortName}
              </span>
              <span
                className={
                  "font-mono text-[11px] tabular tracking-wide " +
                  (isPos ? "text-gold-deep" : "text-danger")
                }
              >
                {isPos ? "+" : ""}
                {marginPct}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-none bg-surface-sunken">
              <div
                className="flex h-full"
                style={{ width: `${revenueW.toFixed(2)}%` }}
              >
                {/* Cost portion */}
                <div
                  className="h-full bg-primary/20 transition-all duration-700"
                  style={{ width: `${((costW / revenueW) * 100).toFixed(2)}%` }}
                />
                {/* Profit portion */}
                <div
                  className={
                    "h-full flex-1 transition-all duration-700 " +
                    (isPos
                      ? "bg-gradient-to-r from-gold/70 to-gold"
                      : "bg-danger/60")
                  }
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LegendDot({ color, label }: { color: "gold" | "muted"; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={
          "h-2 w-4 rounded-none " +
          (color === "gold" ? "bg-gold" : "bg-primary/20")
        }
      />
      <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-dim">
        {label}
      </span>
    </div>
  );
}

function SpotCardLarge({
  label,
  symbol,
  accent,
  price,
  fetchedAt,
}: {
  label: string;
  symbol: string;
  accent: "gold" | "silver";
  price: number | null;
  fetchedAt: string | null;
}) {
  const isGold = accent === "gold";
  return (
    <div className="group relative overflow-hidden border border-border bg-surface-raised p-8 shadow-paper transition-all duration-500 ease-out-expo hover:border-primary/40 hover:shadow-vault">
      {/* corner accent — más cálido en oro, más frío en plata */}
      <span
        aria-hidden
        className={
          "absolute right-0 top-0 h-32 w-32 blur-2xl " +
          (isGold
            ? "bg-gradient-to-br from-gold/30 via-gold/10 to-transparent"
            : "bg-gradient-to-br from-primary/15 via-primary/5 to-transparent")
        }
      />
      <span
        aria-hidden
        className={
          "absolute bottom-0 left-0 h-px transition-all duration-500 " +
          (isGold ? "bg-gold" : "bg-primary") +
          " w-1/4 group-hover:w-1/2"
        }
      />

      <div className="flex items-start justify-between">
        <div>
          <span
            className={
              "font-mono text-[10px] uppercase tracking-[0.32em] " +
              (isGold ? "text-gold-deep" : "text-primary/70")
            }
          >
            {label}
          </span>
          <div className="mt-1 flex items-center gap-2 text-text-dim">
            <span className="font-mono text-[10px] tracking-[0.28em]">
              {symbol} · EUR/g
            </span>
          </div>
        </div>
        <div
          aria-hidden
          className={
            "h-2 w-2 rounded-full shadow-[0_0_8px] " +
            (isGold
              ? "bg-gold shadow-gold/60"
              : "bg-primary/80 shadow-primary/40")
          }
        />
      </div>

      <div className="mt-6 flex items-baseline gap-3">
        <span className="font-editorial text-[56px] font-light leading-[0.85] tracking-[-0.04em] text-primary tabular sm:text-[72px] lg:text-[88px]">
          {price != null ? price.toFixed(2) : "—"}
        </span>
        <span className="font-mono text-sm uppercase tracking-[0.3em] text-text-muted">
          €/g
        </span>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-hairline pt-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-text-dim">
          {fetchedAt ? "Última actualización" : "Sin datos"}
        </span>
        <span className="font-mono text-[11px] tabular tracking-[0.18em] text-text-muted">
          {fetchedAt
            ? new Date(fetchedAt).toLocaleString("es-ES", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—"}
        </span>
      </div>
    </div>
  );
}
