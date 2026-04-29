"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useRole } from "@/lib/hooks/useRole";
import { formatCurrency } from "@/lib/utils";
import {
  productSchema,
  PURITY_PRESETS,
  type ProductInput,
} from "@/lib/validations/product";
import type { ProductCategoryRow } from "@/lib/supabase/typed";
import {
  createProductAction,
  updateProductAction,
  toggleProductActive,
} from "./actions";

interface ProductFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<ProductInput>;
  productId?: string;
  categories: ProductCategoryRow[];
  spotByMetal: { oro: number | null; plata: number | null };
  globalMarkupPct: number;
}

const emptyDefaults: ProductInput = {
  type: "producto",
  sku: null,
  name: "",
  description: null,
  category_id: null,
  metal: "oro",
  weight_g: 0,
  purity: 0.75,
  markup_per_gram: 0,
  markup_per_piece: 0,
  cost_price: 0,
  stock_min: 0,
  igic_rate: null,
  active: true,
};

export function ProductForm({
  mode,
  defaultValues,
  productId,
  categories,
  spotByMetal,
  globalMarkupPct,
}: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { role } = useRole();
  const readOnly = mode === "edit" && role !== null && role !== "admin";

  const [togglePending, setTogglePending] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    mode: "onBlur",
    defaultValues: {
      ...emptyDefaults,
      ...defaultValues,
    } as ProductInput,
  });

  const metal = watch("metal");
  const categoryId = watch("category_id");
  const weight = Number(watch("weight_g")) || 0;
  const purity = Number(watch("purity")) || 0;
  const markupPg = Number(watch("markup_per_gram")) || 0;
  const markupPp = Number(watch("markup_per_piece")) || 0;

  const inheritedIgic =
    categoryId != null
      ? categories.find((c) => c.id === categoryId)?.igic_rate
      : undefined;

  const spot = spotByMetal[metal] ?? null;

  const computed = useMemo(() => {
    if (!spot) return null;
    const metalValue = weight * purity * spot * (1 + globalMarkupPct / 100);
    const hechura = weight * markupPg;
    const total = metalValue + hechura + markupPp;
    return {
      metalValue: Math.round(metalValue * 100) / 100,
      hechura: Math.round(hechura * 100) / 100,
      extra: markupPp,
      total: Math.round(total * 100) / 100,
    };
  }, [weight, purity, spot, globalMarkupPct, markupPg, markupPp]);

  const onSubmit = async (values: ProductInput) => {
    const result =
      mode === "create"
        ? await createProductAction(values)
        : await updateProductAction(productId!, values);

    if (!result.success) {
      toast({
        variant: "error",
        title: "No se ha podido guardar",
        description: result.error,
      });
      return;
    }

    toast({
      variant: "success",
      title: mode === "create" ? "Producto creado" : "Cambios guardados",
    });

    if (mode === "create" && result.id) {
      router.push(`/inventario/${result.id}`);
    } else {
      router.refresh();
    }
  };

  const handleToggleActive = async () => {
    if (!productId) return;
    const current = watch("active");
    const next = !current;
    if (
      !window.confirm(
        next ? "¿Activar este producto?" : "¿Desactivar este producto?"
      )
    )
      return;

    setTogglePending(true);
    const result = await toggleProductActive(productId, next);
    setTogglePending(false);

    if (!result.success) {
      toast({
        variant: "error",
        title: "No se ha podido actualizar",
        description: result.error,
      });
      return;
    }

    toast({
      variant: "success",
      title: next ? "Producto activado" : "Producto desactivado",
    });
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
      {readOnly && (
        <div className="border-l-2 border-warning bg-warning/10 px-4 py-3 text-sm text-text-muted">
          Tu rol actual es sólo lectura. Los cambios no se podrán guardar.
        </div>
      )}

      {/* Identificación */}
      <FormSection
        eyebrow="01"
        title="Identificación"
        description="Nombre, referencia y categoría fiscal."
      >
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
          <Input
            label="Nombre"
            {...register("name")}
            error={errors.name?.message}
            disabled={readOnly}
          />
          <Input
            label="SKU / Referencia"
            {...register("sku")}
            error={errors.sku?.message}
            disabled={readOnly}
          />
          <Select
            label="Categoría"
            {...register("category_id")}
            error={errors.category_id?.message}
            disabled={readOnly}
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · IGIC {c.igic_rate}%
              </option>
            ))}
          </Select>
          <Input
            label={
              inheritedIgic !== undefined
                ? `IGIC override (categoría: ${inheritedIgic}%)`
                : "IGIC override"
            }
            type="number"
            step="0.01"
            placeholder="Heredar de categoría"
            {...register("igic_rate")}
            error={errors.igic_rate?.message}
            disabled={readOnly}
            help="Vacío = hereda de la categoría"
          />
          <div className="md:col-span-2">
            <label className="block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-text-dim">
              Descripción
            </label>
            <textarea
              {...register("description")}
              disabled={readOnly}
              rows={2}
              className="mt-2 block w-full resize-none border-b border-border bg-transparent px-0 py-2.5 text-[15px] text-primary placeholder:text-text-dim/70 transition-colors focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </FormSection>

      {/* Metal y peso */}
      <FormSection
        eyebrow="02"
        title="Metal y peso"
        description="Define el metal, peso bruto y ley. La cotización vigente se aplica automáticamente."
      >
        <div className="space-y-6">
          <Controller
            control={control}
            name="metal"
            render={({ field }) => (
              <div>
                <label className="block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-text-dim">
                  Metal
                </label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {(["oro", "plata"] as const).map((m) => {
                    const active = field.value === m;
                    const ms = spotByMetal[m];
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          field.onChange(m);
                          // ajusta ley por defecto si veníamos de otro metal
                          const current = Number(watch("purity"));
                          if (m === "oro" && (current === 0.925 || current === 0.999))
                            setValue("purity", 0.75, { shouldDirty: true });
                          if (m === "plata" && (current === 0.75 || current === 0.585))
                            setValue("purity", 0.925, { shouldDirty: true });
                        }}
                        disabled={readOnly}
                        className={
                          "group flex items-center justify-between border px-4 py-3 text-left transition-all " +
                          (active
                            ? "border-primary bg-surface-raised shadow-paper"
                            : "border-border bg-transparent hover:border-border-strong")
                        }
                      >
                        <div>
                          <div className="font-display text-base font-medium text-primary">
                            {m === "oro" ? "Oro" : "Plata"}
                          </div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">
                            {m === "oro" ? "XAU · 24k base" : "XAG · .999 base"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-[11px] tabular text-text-muted">
                            {ms != null ? `${ms.toFixed(2)} €/g` : "—"}
                          </div>
                          <div className="font-mono text-[9px] tracking-[0.22em] text-text-dim">
                            SPOT
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {errors.metal?.message && (
                  <p className="mt-2 text-[11px] text-danger">
                    {errors.metal.message}
                  </p>
                )}
              </div>
            )}
          />

          <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
            <Input
              label="Peso bruto (g)"
              type="number"
              step="0.001"
              {...register("weight_g")}
              error={errors.weight_g?.message}
              disabled={readOnly}
            />
            <Select
              label="Ley"
              value={String(purity || 0.75)}
              onChange={(e) =>
                setValue("purity", Number(e.target.value), {
                  shouldDirty: true,
                })
              }
              error={errors.purity?.message}
              disabled={readOnly}
            >
              {PURITY_PRESETS.filter((p) =>
                metal === "oro"
                  ? p.label.startsWith("Oro")
                  : p.label.startsWith("Plata")
              ).map((p) => (
                <option key={p.label} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
            <Input
              label="Peso fino calculado"
              value={(weight * purity).toFixed(3)}
              disabled
              help="peso × ley"
            />
          </div>
        </div>
      </FormSection>

      {/* Hechura */}
      <FormSection
        eyebrow="03"
        title="Hechura y extras"
        description={`Sobre el spot se aplica el margen global del ${globalMarkupPct}% (configurable en Configuración). Aquí defines hechura por gramo y montaje por pieza.`}
      >
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
          <Input
            label="Hechura (€/g)"
            type="number"
            step="0.01"
            {...register("markup_per_gram")}
            error={errors.markup_per_gram?.message}
            disabled={readOnly}
            help="Mano de obra y diseño por gramo"
          />
          <Input
            label="Extra por pieza (€)"
            type="number"
            step="0.01"
            {...register("markup_per_piece")}
            error={errors.markup_per_piece?.message}
            disabled={readOnly}
            help="Cierres, montaje, complementos fijos"
          />
        </div>
      </FormSection>

      {/* Inventario y costo */}
      <FormSection
        eyebrow="04"
        title="Inventario y coste"
        description="Coste de adquisición histórico (informativo) y stock mínimo de aviso."
      >
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
          <Input
            label="Coste unitario (€)"
            type="number"
            step="0.01"
            {...register("cost_price")}
            error={errors.cost_price?.message}
            disabled={readOnly}
            help="Precio de compra/coste contable"
          />
          <Input
            label="Stock mínimo"
            type="number"
            step="1"
            {...register("stock_min")}
            error={errors.stock_min?.message}
            disabled={readOnly}
            help="Aviso visual cuando bajas a este nivel"
          />
        </div>
      </FormSection>

      {/* Vista previa */}
      <FormSection
        eyebrow="05"
        title="Vista previa de precio"
        description="Cálculo en vivo con la cotización actual. Se actualiza al cambiar peso, ley o extras."
      >
        <div className="border border-border bg-surface-raised p-6 shadow-paper">
          {!spot ? (
            <p className="text-[13px] text-text-muted">
              Sin cotización registrada para {metal}. Refresca la cotización
              desde Configuración → Cotización.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto]">
              <div className="space-y-2 font-mono text-[12.5px] tabular text-text-muted">
                <Row
                  label={`Metal · ${weight.toFixed(3)} g × ${purity.toFixed(3)} × ${spot.toFixed(2)} €/g × (1+${globalMarkupPct}%)`}
                  value={formatCurrency(computed?.metalValue ?? 0)}
                />
                <Row
                  label={`Hechura · ${weight.toFixed(3)} g × ${markupPg.toFixed(2)} €/g`}
                  value={formatCurrency(computed?.hechura ?? 0)}
                />
                <Row
                  label="Extra por pieza"
                  value={formatCurrency(computed?.extra ?? 0)}
                />
              </div>
              <div className="flex flex-col items-end justify-center border-l border-border pl-6">
                <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold-deep">
                  Precio sin IGIC
                </span>
                <span className="font-editorial text-[44px] leading-none tracking-[-0.03em] text-primary tabular">
                  {formatCurrency(computed?.total ?? 0)}
                </span>
              </div>
            </div>
          )}
        </div>
      </FormSection>

      {mode === "edit" && (
        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input
            type="checkbox"
            {...register("active")}
            disabled={readOnly}
            className="h-4 w-4 border-border bg-surface-raised accent-primary"
          />
          Producto activo
        </label>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-6">
        <div>
          {mode === "edit" && productId && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleToggleActive}
              loading={togglePending}
              disabled={readOnly || togglePending}
            >
              {watch("active") ? "Desactivar producto" : "Activar producto"}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {mode === "edit" && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/inventario")}
            >
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={
              readOnly || isSubmitting || (mode === "edit" && !isDirty)
            }
          >
            {mode === "create" ? "Crear producto" : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function FormSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid grid-cols-12 gap-8">
      <div className="col-span-12 md:col-span-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold-deep">
          {eyebrow}
        </span>
        <h2 className="mt-2 font-display text-xl font-medium tracking-tight text-primary">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-[13px] leading-relaxed text-text-muted">
            {description}
          </p>
        )}
        <span className="mt-4 block h-px w-12 bg-gold/60" />
      </div>
      <div className="col-span-12 md:col-span-9">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-hairline pb-1.5">
      <span className="text-[12px] text-text-muted">{label}</span>
      <span className="text-[13.5px] text-primary">{value}</span>
    </div>
  );
}
