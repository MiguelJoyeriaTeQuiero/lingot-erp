import Link from "next/link";
import { ArrowUpRight, TrendingUp, Sparkle, ScrollText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { createTypedClient } from "@/lib/supabase/typed";
import { getLatestSpots } from "@/lib/metal-prices";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createTypedClient();

  const [docsRes, clientsRes, productsRes, spots] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60),
    supabase.from("clients").select("*").limit(500),
    supabase.from("products").select("*").limit(500),
    getLatestSpots(),
  ]);

  const documents = docsRes.data ?? [];
  const clients = clientsRes.data ?? [];
  const products = productsRes.data ?? [];

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
                  href="/documentos"
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
                <div className="flex items-baseline gap-3">
                  <span className="font-editorial text-[112px] font-normal leading-[0.85] tracking-[-0.04em] text-primary tabular">
                    {Math.floor(monthRevenue).toLocaleString("es-ES")}
                  </span>
                  <span className="font-editorial text-[44px] italic leading-none text-gold-deep">
                    ,{monthRevenue.toFixed(2).split(".")[1] ?? "00"}
                  </span>
                  <span className="ml-2 font-mono text-xs uppercase tracking-[0.3em] text-text-dim">
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

      {/* Cotización · sección prominente */}
      <section className="reveal delay-2">
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
      <section className="reveal delay-3">
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
                  className="group grid grid-cols-12 items-center gap-4 border-b border-hairline px-2 py-5 transition-colors hover:bg-surface-sunken/60"
                >
                  <div className="col-span-1 font-mono text-[11px] tabular tracking-wider text-text-dim">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="col-span-3">
                    <div className="font-mono text-[12px] tabular tracking-wider text-gold-deep">
                      {doc.code ?? "—"}
                    </div>
                    <div className="mt-0.5 text-[11px] uppercase tracking-widest text-text-dim">
                      {doc.doc_type}
                    </div>
                  </div>
                  <div className="col-span-4 truncate text-[14px] text-primary">
                    {client?.name ?? "Cliente sin asignar"}
                  </div>
                  <div className="col-span-2">
                    <Badge variant={statusToBadge[doc.status] ?? "neutral"} />
                  </div>
                  <div className="col-span-2 text-right">
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
      <section className="reveal delay-4">
        <div className="grid grid-cols-12 items-end gap-6 border-t border-border pt-10">
          <div className="col-span-8 flex items-center gap-3">
            <Sparkle className="h-3 w-3 text-gold" strokeWidth={1.5} />
            <span className="font-editorial text-[28px] italic leading-none text-text-muted">
              precisión orfebre, gestión cotidiana.
            </span>
          </div>
          <div className="col-span-4 text-right">
            <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-text-dim">
              Lingot · Te Quiero Group · {now.getFullYear()}
            </span>
          </div>
        </div>
      </section>
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
        <span className="font-editorial text-[88px] font-light leading-[0.85] tracking-[-0.04em] text-primary tabular">
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
