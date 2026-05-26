"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  X,
  ShoppingCart,
  Paperclip,
  Receipt,
  PackageCheck,
  Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  purchaseOrderSchema,
  type PurchaseOrderInput,
} from "@/lib/validations/product";
import { createPurchaseOrderAction, markPurchaseOrderReceivedAction } from "../actions";
import { createClient } from "@/lib/supabase/client";

export interface PurchaseOrderEntry {
  id: string;
  order_date: string;
  supplier_name: string | null;
  quantity: number;
  cost_per_gram: number;
  spot_price_per_g: number | null;
  total_cost: number | null;
  notes: string | null;
  created_at: string;
  delta: number | null;
  deltaPct: number | null;
  invoice_url?: string | null;
  invoice_urls?: string[] | null;
  received: boolean;
  received_at?: string | null;
}

interface Props {
  productId: string;
  weightG: number;
  metal: "oro" | "plata";
  currentSpotPerG: number | null;
  orders: PurchaseOrderEntry[];
  isAdmin?: boolean;
  canReceive?: boolean;
}

const ACCEPTED = ".pdf,.jpg,.jpeg,.png,.webp";
const MAX_MB = 10;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PurchaseOrderSection({
  productId,
  weightG,
  currentSpotPerG,
  orders,
  isAdmin = true,
  canReceive = true,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PurchaseOrderInput>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      order_date: today(),
      supplier_name: null,
      quantity: undefined as unknown as number,
      cost_per_unit: undefined as unknown as number,
      spot_price_per_g: currentSpotPerG ?? null,
      total_cost: null,
      notes: null,
    },
  });

  const qty = Number(watch("quantity") ?? 0);
  const cpu = Number(watch("cost_per_unit") ?? 0);
  const estimatedTotal = qty > 0 && cpu > 0 ? qty * cpu : null;
  const cpgDisplay = cpu > 0 && weightG > 0 ? cpu / weightG : null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    const oversized = picked.filter((f) => f.size > MAX_MB * 1024 * 1024);
    if (oversized.length > 0) {
      toast({ variant: "error", title: "Archivo demasiado grande", description: `Máximo ${MAX_MB} MB por archivo.` });
      return;
    }
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      const added = picked.filter((f) => !existing.has(f.name + f.size));
      return [...prev, ...added];
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function uploadFile(f: File): Promise<string> {
    const supabase = createClient();
    const ext = f.name.split(".").pop() ?? "pdf";
    const path = `orders/${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data: up, error: upErr } = await supabase.storage
      .from("purchase-invoices")
      .upload(path, f, { contentType: f.type, upsert: false });
    if (upErr) throw new Error(upErr.message);
    return supabase.storage.from("purchase-invoices").getPublicUrl(up.path).data.publicUrl;
  }

  async function onSubmit(values: PurchaseOrderInput) {
    setSubmitting(true);

    let invoiceUrls: string[] = [];
    if (files.length > 0) {
      try {
        invoiceUrls = await Promise.all(files.map(uploadFile));
      } catch (err) {
        toast({ variant: "error", title: "Error subiendo documentos", description: String(err) });
        setSubmitting(false);
        return;
      }
    }

    const result = await createPurchaseOrderAction(productId, values, invoiceUrls);
    setSubmitting(false);

    if (!result.success) {
      toast({
        variant: "error",
        title: "No se ha podido registrar el pedido",
        description: result.error,
      });
      return;
    }

    toast({ variant: "success", title: "Pedido registrado — lote creado y disponible para asignar a ventas" });
    reset({
      order_date: today(),
      supplier_name: null,
      quantity: undefined as unknown as number,
      cost_per_unit: undefined as unknown as number,
      spot_price_per_g: currentSpotPerG ?? null,
      total_cost: null,
      notes: null,
    });
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsOpen(false);
    router.refresh();
  }

  async function markReceived(orderId: string) {
    setReceivingId(orderId);
    const result = await markPurchaseOrderReceivedAction(orderId, productId);
    setReceivingId(null);
    if (!result.success) {
      toast({ variant: "error", title: "No se pudo registrar", description: result.error });
      return;
    }
    toast({ variant: "success", title: "Pedido recibido y stock actualizado" });
    router.refresh();
  }

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-sm uppercase tracking-widest text-text-muted">
          Pedidos de reposición
        </h2>
        <Button variant="secondary" onClick={() => setIsOpen((v) => !v)}>
          {isOpen ? (
            <>
              <X className="h-4 w-4" strokeWidth={1.5} />
              Cancelar
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              Nuevo pedido
            </>
          )}
        </Button>
      </div>

      {isOpen && (
        <div className="rounded-md border border-border bg-surface p-6">
          <h3 className="mb-4 font-display text-sm uppercase tracking-widest text-text-muted">
            Registrar pedido de reposición
          </h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Fecha del pedido"
                type="date"
                {...register("order_date")}
                error={errors.order_date?.message}
              />
              <Input
                label="Proveedor (opcional)"
                {...register("supplier_name")}
                error={errors.supplier_name?.message}
                placeholder="Nombre del proveedor"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input
                label="Cantidad (unidades)"
                type="number"
                step="0.001"
                min="0.001"
                {...register("quantity")}
                error={errors.quantity?.message}
              />
              <Input
                label="Coste por unidad (€)"
                type="number"
                step="0.01"
                min="0.01"
                {...register("cost_per_unit")}
                error={errors.cost_per_unit?.message}
                help={
                  cpgDisplay != null
                    ? `≈ ${cpgDisplay.toFixed(4)} €/g`
                    : "Precio total del producto (lingote, pieza…)"
                }
              />
              <Input
                label="Spot €/g (referencia)"
                type="number"
                step="0.0001"
                min="0"
                {...register("spot_price_per_g")}
                error={errors.spot_price_per_g?.message}
                help="Precio spot del metal en este momento"
              />
            </div>

            {estimatedTotal != null && (
              <div className="rounded-md border border-gold/30 bg-gold/5 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-muted">
                    Coste total del pedido
                    <span className="ml-1 text-xs">
                      ({qty} u × {formatCurrency(cpu)})
                    </span>
                  </span>
                  <span className="font-display text-lg text-gold">
                    {formatCurrency(estimatedTotal)}
                  </span>
                </div>
              </div>
            )}

            <Input
              label="Notas (opcional)"
              {...register("notes")}
              error={errors.notes?.message}
              placeholder="Observaciones del pedido"
            />

            {/* Documentos del proveedor */}
            <div>
              <div className="mb-1.5 text-[13px] font-medium text-primary">
                Documentos del proveedor (opcional)
              </div>
              <div className="space-y-1.5">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-md border border-border bg-surface-raised px-3 py-2 text-sm">
                    <Receipt className="h-4 w-4 shrink-0 text-gold-deep" strokeWidth={1.5} />
                    <span className="flex-1 truncate text-text-muted">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-text-muted hover:text-danger"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                ))}
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2.5 text-sm text-text-muted transition-colors hover:border-gold/50 hover:text-primary">
                  <Paperclip className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  {files.length === 0 ? "Adjuntar facturas o imágenes" : "Añadir otro documento"}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED}
                    multiple
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={submitting}>
                <ShoppingCart className="h-4 w-4" strokeWidth={1.5} />
                Registrar pedido
              </Button>
            </div>
          </form>
        </div>
      )}


      <div className="rounded-md border border-border bg-surface">
        {orders.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-text-muted">
            Aún no hay pedidos de reposición registrados.
          </div>
        ) : (
          <Table className="min-w-[780px]">
            <THead>
              <TR>
                <TH>Fecha</TH>
                <TH>Proveedor</TH>
                <TH className="text-right">Cantidad</TH>
                <TH className="text-right">Coste/u</TH>
                <TH className="text-right">Total pedido</TH>
                <TH className="text-right">Fluctuación</TH>
                <TH>Factura</TH>
                <TH>Recibido</TH>
              </TR>
            </THead>
            <TBody>
              {orders.map((order) => (
                <TR key={order.id}>
                  <TD className="text-text-muted">{formatDate(order.order_date)}</TD>
                  <TD className="text-text-muted">{order.supplier_name ?? "—"}</TD>
                  <TD className="text-right">
                    {Number(order.quantity).toLocaleString("es-ES", {
                      maximumFractionDigits: 3,
                    })}
                  </TD>
                  <TD className="text-right font-mono text-sm">
                    {weightG > 0
                      ? formatCurrency(Number(order.cost_per_gram) * weightG)
                      : formatCurrency(Number(order.cost_per_gram))}
                  </TD>
                  <TD className="text-right font-mono text-sm">
                    {order.total_cost != null
                      ? formatCurrency(Number(order.total_cost))
                      : "—"}
                  </TD>
                  <TD className="text-right">
                    <FluctuationCell delta={order.delta} deltaPct={order.deltaPct} />
                  </TD>
                  <TD>
                    <OrderDocuments order={order} />
                  </TD>
                  <TD>
                    {order.received ? (
                      <span className="inline-flex items-center gap-1 text-xs text-success">
                        <PackageCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Recibido
                      </span>
                    ) : canReceive ? (
                      receivingId === order.id ? (
                        <span className="text-xs text-text-muted">Procesando…</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => markReceived(order.id)}
                          className="inline-flex items-center gap-1 rounded border border-gold/40 bg-gold/5 px-2 py-0.5 text-xs text-gold-deep transition-colors hover:bg-gold/10"
                        >
                          <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                          Marcar recibido
                        </button>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-text-dim">
                        <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                        En tránsito
                      </span>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </section>
  );
}

function OrderDocuments({ order }: { order: PurchaseOrderEntry }) {
  const urls: string[] = [];
  if (order.invoice_urls && order.invoice_urls.length > 0) {
    urls.push(...order.invoice_urls);
  } else if (order.invoice_url) {
    urls.push(order.invoice_url);
  }
  if (urls.length === 0) return <span className="text-text-dim text-xs">—</span>;
  return (
    <div className="flex flex-col gap-1">
      {urls.map((url, i) => (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-gold-deep underline-offset-2 hover:underline"
        >
          <Receipt className="h-3.5 w-3.5" strokeWidth={1.5} />
          Doc {urls.length > 1 ? i + 1 : ""}
        </a>
      ))}
    </div>
  );
}

function FluctuationCell({
  delta,
  deltaPct,
}: {
  delta: number | null;
  deltaPct: number | null;
}) {
  if (delta === null || deltaPct === null) {
    return <span className="text-text-dim text-xs">—</span>;
  }
  if (Math.abs(delta) < 0.00005) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-text-muted">
        <Minus className="h-3.5 w-3.5" strokeWidth={2} />
        Sin cambio
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-danger">
        <TrendingUp className="h-3.5 w-3.5" strokeWidth={2} />
        +{deltaPct.toFixed(2)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-success">
      <TrendingDown className="h-3.5 w-3.5" strokeWidth={2} />
      {deltaPct.toFixed(2)}%
    </span>
  );
}
