"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/components/ui/toast";
import { useRole } from "@/lib/hooks/useRole";
import { formatCurrency } from "@/lib/utils";
import { computeUnitPrice } from "@/lib/pricing";
import {
  computeLine,
  documentSchema,
  type DocumentInput,
} from "@/lib/validations/document";
import type {
  ClientRow,
  ProductRow,
  ProductCategoryRow,
} from "@/lib/supabase/typed";
import {
  createAndEmitDocument,
  createDocumentDraft,
  deleteDocumentDraft,
  emitDocumentDraft,
  updateDocumentDraft,
} from "./actions";

interface DocumentEditorProps {
  mode: "create" | "edit";
  documentId?: string;
  defaultValues?: DocumentInput;
  status?: string;
  clients: ClientRow[];
  products: ProductRow[];
  categories: ProductCategoryRow[];
  spotByMetal: { oro: number | null; plata: number | null };
  globalMarkupPct: number;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

const emptyLine = {
  product_id: null as string | null,
  description: "",
  quantity: 1,
  unit_price: 0,
  discount_pct: 0,
  igic_rate: 0,
};

const emptyDoc = (
  preselectedClientId?: string | null,
  preselectedType?: "albaran" | "factura"
): DocumentInput => ({
  doc_type: preselectedType ?? "albaran",
  client_id: preselectedClientId ?? "",
  issue_date: todayIso(),
  due_date: null,
  notes: null,
  lines: [{ ...emptyLine }],
});

export function DocumentEditor({
  mode,
  documentId,
  defaultValues,
  status,
  clients,
  products,
  categories,
  spotByMetal,
  globalMarkupPct,
}: DocumentEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { role } = useRole();
  const [submitting, setSubmitting] = useState(false);
  const [emitting, setEmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isDraft = mode === "create" || status === "borrador";
  const readOnly =
    !isDraft || (mode === "edit" && role !== null && role !== "admin");

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<DocumentInput>({
    resolver: zodResolver(documentSchema),
    mode: "onBlur",
    defaultValues: defaultValues ?? emptyDoc(),
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const lines = watch("lines");
  const clientId = watch("client_id");

  const clientOptions = useMemo(
    () =>
      clients
        .filter((c) => c.active)
        .map((c) => ({
          value: c.id,
          label: c.name,
          hint: c.tax_id ?? c.email ?? undefined,
        })),
    [clients]
  );

  const productOptions = useMemo(
    () =>
      products
        .filter((p) => p.active)
        .map((p) => ({
          value: p.id,
          label: p.name,
          hint: p.sku ?? undefined,
        })),
    [products]
  );

  const productById = useMemo(() => {
    const m = new Map<string, ProductRow>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const categoryById = useMemo(() => {
    const m = new Map<string, ProductCategoryRow>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  // Precio según spot vigente — depende sólo del producto, no del cliente.
  function priceForProduct(p: ProductRow): number | null {
    const spot = spotByMetal[p.metal];
    if (spot == null) return null;
    return computeUnitPrice({
      weight_g: Number(p.weight_g),
      purity: Number(p.purity),
      metal: p.metal,
      markup_per_gram: Number(p.markup_per_gram),
      markup_per_piece: Number(p.markup_per_piece),
      spot_eur_per_g: spot,
      global_markup_pct: globalMarkupPct,
    });
  }

  function igicForProduct(p: ProductRow): number {
    if (p.igic_rate !== null) return p.igic_rate;
    if (p.category_id) {
      const cat = categoryById.get(p.category_id);
      if (cat) return cat.igic_rate;
    }
    return 0;
  }

  function applyProductToLine(idx: number, productId: string | null) {
    setValue(`lines.${idx}.product_id`, productId, { shouldDirty: true });
    if (!productId) return;
    const p = productById.get(productId);
    if (!p) return;
    setValue(`lines.${idx}.description`, p.name, { shouldDirty: true });
    const computed = priceForProduct(p);
    if (computed != null) {
      setValue(`lines.${idx}.unit_price`, computed, { shouldDirty: true });
    }
    setValue(`lines.${idx}.igic_rate`, igicForProduct(p), {
      shouldDirty: true,
    });
  }

  function onClientChange(newId: string | null) {
    setValue("client_id", newId ?? "", { shouldDirty: true });
    // Con pricing por spot el cliente no afecta al precio.
  }

  // Totales calculados en vivo
  const totals = useMemo(() => {
    const computed = (lines ?? []).map((l) =>
      computeLine({
        quantity: Number(l.quantity) || 0,
        unit_price: Number(l.unit_price) || 0,
        discount_pct: Number(l.discount_pct) || 0,
        igic_rate: Number(l.igic_rate) || 0,
      })
    );
    const subtotal = computed.reduce((s, c) => s + c.line_subtotal, 0);
    const igic = computed.reduce((s, c) => s + c.line_igic, 0);
    return {
      perLine: computed,
      subtotal,
      igic_total: igic,
      total: subtotal + igic,
    };
  }, [lines]);

  const persist = async (
    values: DocumentInput,
    intent: "draft" | "emit"
  ) => {
    if (mode === "create") {
      return intent === "emit"
        ? await createAndEmitDocument(values)
        : await createDocumentDraft(values);
    }
    return await updateDocumentDraft(documentId!, values);
  };

  const onSubmit = async (values: DocumentInput) => {
    setSubmitting(true);
    const result = await persist(values, "draft");
    setSubmitting(false);

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
      title: mode === "create" ? "Borrador creado" : "Cambios guardados",
    });
    if (mode === "create" && result.id) {
      router.push(`/documentos/${result.id}`);
    } else {
      router.refresh();
    }
  };

  const onCreateAndEmit = handleSubmit(async (values) => {
    if (
      !window.confirm(
        "Vas a emitir el documento. Se le asignará número y, si tiene productos físicos, se descontará el stock. ¿Continuar?"
      )
    ) {
      return;
    }
    setEmitting(true);
    const result = await persist(values, "emit");
    setEmitting(false);

    if (!result.success) {
      toast({
        variant: "error",
        title: "No se ha podido emitir",
        description: result.error,
      });
      // Si el borrador se creó pero falló al emitir, llevamos al usuario al detalle.
      if (result.id) router.push(`/documentos/${result.id}`);
      return;
    }
    toast({ variant: "success", title: "Documento emitido" });
    if (result.id) router.push(`/documentos/${result.id}`);
  });

  const onEmitExisting = async () => {
    if (!documentId) return;
    if (
      !window.confirm(
        "Vas a emitir este borrador. Se le asignará número y se descontará el stock de los productos físicos. ¿Continuar?"
      )
    ) {
      return;
    }
    setEmitting(true);
    const result = await emitDocumentDraft(documentId);
    setEmitting(false);
    if (!result.success) {
      toast({
        variant: "error",
        title: "No se ha podido emitir",
        description: result.error,
      });
      return;
    }
    toast({ variant: "success", title: "Documento emitido" });
    router.refresh();
  };

  const onDelete = async () => {
    if (!documentId) return;
    if (!window.confirm("¿Eliminar este borrador? No se podrá recuperar.")) {
      return;
    }
    setDeleting(true);
    const result = await deleteDocumentDraft(documentId);
    setDeleting(false);
    if (!result.success) {
      toast({
        variant: "error",
        title: "No se ha podido eliminar",
        description: result.error,
      });
      return;
    }
    toast({ variant: "success", title: "Borrador eliminado" });
    router.push("/documentos");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {readOnly && mode === "edit" && (
        <div className="rounded-md border border-border bg-surface-raised px-4 py-3 text-sm text-text-muted">
          {!isDraft
            ? "Este documento ya no está en borrador, no se puede editar."
            : "Tu rol actual es sólo lectura."}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-[180px_1fr_180px_180px]">
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted">
            Tipo
          </label>
          <Controller
            control={control}
            name="doc_type"
            render={({ field }) => (
              <div className="flex gap-2">
                {(["albaran", "factura"] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => field.onChange(t)}
                    disabled={readOnly}
                    className={
                      "flex-1 rounded-md border px-3 py-2 text-xs uppercase tracking-widest transition-colors " +
                      (field.value === t
                        ? "border-gold bg-gold/10 text-gold"
                        : "border-border bg-surface-raised text-text-muted hover:text-text")
                    }
                  >
                    {t === "albaran" ? "Albarán" : "Factura"}
                  </button>
                ))}
              </div>
            )}
          />
        </div>

        <Controller
          control={control}
          name="client_id"
          render={({ field }) => (
            <Combobox
              label="Cliente"
              placeholder="Seleccionar cliente…"
              options={clientOptions}
              value={field.value || null}
              onChange={(v) => onClientChange(v)}
              error={errors.client_id?.message}
              disabled={readOnly}
              emptyText="Sin clientes activos"
            />
          )}
        />

        <Input
          label="Fecha emisión"
          type="date"
          {...register("issue_date")}
          error={errors.issue_date?.message}
          disabled={readOnly}
        />
        <Input
          label="Vencimiento"
          type="date"
          {...register("due_date")}
          error={errors.due_date?.message}
          disabled={readOnly}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm uppercase tracking-widest text-text-muted">
            Líneas
          </h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => append({ ...emptyLine })}
            disabled={readOnly}
          >
            <Plus className="h-4 w-4" />
            Añadir línea
          </Button>
        </div>

        <div className="rounded-md border border-border bg-surface">
          <div className="hidden grid-cols-[1.4fr_2fr_90px_120px_90px_90px_120px_40px] gap-2 border-b border-border bg-surface-raised/60 px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-text-muted md:grid">
            <div>Producto</div>
            <div>Descripción</div>
            <div className="text-right">Cant.</div>
            <div className="text-right">Precio</div>
            <div className="text-right">Dto. %</div>
            <div className="text-right">IGIC %</div>
            <div className="text-right">Total línea</div>
            <div></div>
          </div>

          <div className="divide-y divide-border">
            {fields.map((field, idx) => {
              const lineTotal = totals.perLine[idx]?.line_total ?? 0;
              return (
                <div
                  key={field.id}
                  className="grid grid-cols-1 gap-2 px-3 py-3 md:grid-cols-[1.4fr_2fr_90px_120px_90px_90px_120px_40px] md:items-start"
                >
                  <Controller
                    control={control}
                    name={`lines.${idx}.product_id`}
                    render={({ field: f }) => (
                      <Combobox
                        options={productOptions}
                        value={f.value ?? null}
                        onChange={(v) => applyProductToLine(idx, v)}
                        placeholder="Buscar…"
                        emptyText="Sin productos"
                        allowClear
                        disabled={readOnly}
                      />
                    )}
                  />
                  <Input
                    placeholder="Descripción"
                    {...register(`lines.${idx}.description` as const)}
                    error={errors.lines?.[idx]?.description?.message}
                    disabled={readOnly}
                  />
                  <Input
                    type="number"
                    step="0.001"
                    className="text-right"
                    {...register(`lines.${idx}.quantity` as const)}
                    error={errors.lines?.[idx]?.quantity?.message}
                    disabled={readOnly}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    className="text-right"
                    {...register(`lines.${idx}.unit_price` as const)}
                    error={errors.lines?.[idx]?.unit_price?.message}
                    disabled={readOnly}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    className="text-right"
                    {...register(`lines.${idx}.discount_pct` as const)}
                    error={errors.lines?.[idx]?.discount_pct?.message}
                    disabled={readOnly}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    className="text-right"
                    {...register(`lines.${idx}.igic_rate` as const)}
                    error={errors.lines?.[idx]?.igic_rate?.message}
                    disabled={readOnly}
                  />
                  <div className="flex h-10 items-center justify-end px-3 text-sm tabular-nums text-text">
                    {formatCurrency(lineTotal)}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    disabled={readOnly || fields.length === 1}
                    aria-label="Eliminar línea"
                    className="flex h-10 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-raised hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        {errors.lines && typeof errors.lines.message === "string" && (
          <p className="text-xs text-danger">{errors.lines.message}</p>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_320px]">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">
            Notas
          </label>
          <textarea
            {...register("notes")}
            disabled={readOnly}
            rows={4}
            className="block w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text placeholder:text-text-muted/60 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/60"
          />
        </div>
        <div className="rounded-md border border-border bg-surface-raised/40 p-4">
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-text-muted">Subtotal</dt>
              <dd className="tabular-nums">
                {formatCurrency(totals.subtotal)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-text-muted">IGIC</dt>
              <dd className="tabular-nums">
                {formatCurrency(totals.igic_total)}
              </dd>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-border pt-3 text-base">
              <dt className="font-medium uppercase tracking-widest text-text-muted">
                Total
              </dt>
              <dd className="font-display text-xl tabular-nums text-gold">
                {formatCurrency(totals.total)}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        <div>
          {mode === "edit" && documentId && isDraft && !readOnly && (
            <Button
              type="button"
              variant="secondary"
              onClick={onDelete}
              loading={deleting}
              disabled={deleting}
            >
              Eliminar borrador
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/documentos")}
          >
            {readOnly ? "Volver" : "Cancelar"}
          </Button>
          <Button
            type="submit"
            variant="secondary"
            loading={submitting}
            disabled={
              readOnly ||
              submitting ||
              emitting ||
              (mode === "edit" && !isDirty)
            }
          >
            {mode === "create" ? "Guardar borrador" : "Guardar cambios"}
          </Button>
          {!readOnly && mode === "create" && (
            <Button
              type="button"
              onClick={onCreateAndEmit}
              loading={emitting}
              disabled={emitting || submitting}
            >
              Crear y emitir
            </Button>
          )}
          {!readOnly && mode === "edit" && isDraft && (
            <Button
              type="button"
              onClick={onEmitExisting}
              loading={emitting}
              disabled={emitting || submitting || isDirty}
              title={
                isDirty
                  ? "Guarda los cambios antes de emitir"
                  : "Asigna número y descuenta stock"
              }
            >
              Emitir documento
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
