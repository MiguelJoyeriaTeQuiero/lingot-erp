"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Paperclip, X, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useRole } from "@/lib/hooks/useRole";
import { createClient } from "@/lib/supabase/client";
import {
  stockMovementSchema,
  type StockMovementInput,
} from "@/lib/validations/product";
import { recordStockMovementAction } from "../actions";

interface StockAdjustFormProps {
  productId: string;
  currentStock: number;
}

const movements = [
  { value: "entrada", label: "Entrada", help: "Suma al stock" },
  { value: "salida",  label: "Salida",  help: "Resta del stock" },
  { value: "ajuste",  label: "Ajuste",  help: "Permite valor +/−" },
] as const;

const ACCEPTED = ".pdf,.jpg,.jpeg,.png,.webp";
const MAX_MB = 10;

export function StockAdjustForm({ productId, currentStock }: StockAdjustFormProps) {
  const router    = useRouter();
  const { toast } = useToast();
  const { role }  = useRole();
  const readOnly  = role !== null && role !== "admin";

  const [submitting, setSubmitting] = useState(false);
  const [file, setFile]             = useState<File | null>(null);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<StockMovementInput>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: {
      movement_type: "entrada",
      quantity: 0,
      reason: null,
    } as unknown as StockMovementInput,
  });

  const movementType = watch("movement_type");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    if (!picked) { setFile(null); return; }
    if (picked.size > MAX_MB * 1024 * 1024) {
      toast({ variant: "error", title: "Archivo demasiado grande", description: `Máximo ${MAX_MB} MB.` });
      return;
    }
    setFile(picked);
  }

  function clearFile() {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadInvoice(f: File): Promise<string> {
    const supabase = createClient();
    const ext  = f.name.split(".").pop() ?? "pdf";
    const path = `${productId}/${Date.now()}.${ext}`;

    const { data: up, error: upErr } = await supabase.storage
      .from("purchase-invoices")
      .upload(path, f, { contentType: f.type, upsert: false });

    if (upErr) throw new Error(upErr.message);

    return supabase.storage.from("purchase-invoices").getPublicUrl(up.path).data.publicUrl;
  }

  const onSubmit = async (values: StockMovementInput) => {
    setSubmitting(true);

    let invoiceUrl: string | null = null;

    if (file && values.movement_type === "entrada") {
      try {
        invoiceUrl = await uploadInvoice(file);
      } catch (err) {
        toast({
          variant: "error",
          title: "Error al subir la factura",
          description: err instanceof Error ? err.message : "Error desconocido",
        });
        setSubmitting(false);
        return;
      }
    }

    const result = await recordStockMovementAction(productId, values, invoiceUrl);
    setSubmitting(false);

    if (!result.success) {
      toast({
        variant: "error",
        title: "No se ha podido registrar el movimiento",
        description: result.error,
      });
      return;
    }

    toast({ variant: "success", title: "Movimiento registrado" });
    clearFile();
    reset({
      movement_type: values.movement_type,
      quantity: 0,
      reason: null,
    } as unknown as StockMovementInput);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-sm uppercase tracking-widest text-text-muted">
          Ajustar stock
        </h3>
        <span className="text-sm text-text-muted">
          Stock actual:{" "}
          <span className="font-medium text-text">{currentStock}</span>
        </span>
      </div>

      {/* Tipo de movimiento */}
      <div>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted">
          Tipo de movimiento
        </label>
        <Controller
          control={control}
          name="movement_type"
          render={({ field }) => (
            <div className="grid grid-cols-3 gap-2">
              {movements.map((m) => (
                <button
                  type="button"
                  key={m.value}
                  onClick={() => field.onChange(m.value)}
                  disabled={readOnly}
                  className={
                    "rounded-md border px-3 py-2 text-sm transition-colors " +
                    (field.value === m.value
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-border bg-surface-raised text-text-muted hover:text-text")
                  }
                >
                  <div>{m.label}</div>
                  <div className="text-[10px] uppercase tracking-widest text-text-muted/70">
                    {m.help}
                  </div>
                </button>
              ))}
            </div>
          )}
        />
      </div>

      {/* Cantidad + motivo */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[140px_1fr]">
        <Input
          label="Cantidad"
          type="number"
          step="0.001"
          {...register("quantity")}
          error={errors.quantity?.message}
          disabled={readOnly}
          help={movementType === "ajuste" ? "Puede ser positiva o negativa" : "Sólo positiva"}
        />
        <Input
          label="Motivo (opcional)"
          {...register("reason")}
          error={errors.reason?.message}
          disabled={readOnly}
          placeholder="Ej. compra a proveedor, regularización de inventario…"
        />
      </div>

      {/* Adjuntar factura de compra — solo en entradas */}
      {movementType === "entrada" && (
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted">
            Factura de compra (opcional)
          </label>

          {file ? (
            <div className="flex items-center gap-3 rounded-md border border-gold/40 bg-gold/5 px-4 py-3">
              <FileText className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} />
              <span className="flex-1 truncate text-sm text-text">{file.name}</span>
              <span className="text-xs text-text-muted">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
              <button
                type="button"
                onClick={clearFile}
                disabled={readOnly}
                className="text-text-muted transition-colors hover:text-danger"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <label
              className={
                "flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border px-4 py-3 transition-colors " +
                (readOnly ? "cursor-not-allowed opacity-50" : "hover:border-primary/50 hover:bg-surface-sunken/40")
              }
            >
              <Paperclip className="h-4 w-4 shrink-0 text-text-muted" strokeWidth={1.5} />
              <span className="text-sm text-text-muted">
                Adjuntar factura de compra — PDF, JPG o PNG, máx. {MAX_MB} MB
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED}
                className="sr-only"
                disabled={readOnly}
                onChange={handleFileChange}
              />
            </label>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" loading={submitting} disabled={readOnly}>
          Registrar movimiento
        </Button>
      </div>
    </form>
  );
}
