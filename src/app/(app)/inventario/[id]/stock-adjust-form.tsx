"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useRole } from "@/lib/hooks/useRole";
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
  { value: "salida", label: "Salida", help: "Resta del stock" },
  { value: "ajuste", label: "Ajuste", help: "Permite valor +/−" },
] as const;

export function StockAdjustForm({
  productId,
  currentStock,
}: StockAdjustFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { role } = useRole();
  const readOnly = role !== null && role !== "admin";
  const [submitting, setSubmitting] = useState(false);

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

  const onSubmit = async (values: StockMovementInput) => {
    setSubmitting(true);
    const result = await recordStockMovementAction(productId, values);
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[140px_1fr]">
        <Input
          label="Cantidad"
          type="number"
          step="0.001"
          {...register("quantity")}
          error={errors.quantity?.message}
          disabled={readOnly}
          help={
            movementType === "ajuste"
              ? "Puede ser positiva o negativa"
              : "Sólo positiva"
          }
        />
        <Input
          label="Motivo (opcional)"
          {...register("reason")}
          error={errors.reason?.message}
          disabled={readOnly}
          placeholder="Ej. compra a proveedor, regularización de inventario…"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={submitting} disabled={readOnly}>
          Registrar movimiento
        </Button>
      </div>
    </form>
  );
}
