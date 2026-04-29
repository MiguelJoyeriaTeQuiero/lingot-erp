/**
 * Wrapper tipado del cliente Supabase del servidor.
 *
 * El tipo `Database` en `@/types/database.types` es todavía un placeholder
 * parcial. Hasta que se regenere con `supabase gen types`, el cliente
 * genérico devuelve `never` para las filas y bloquea los inserts.
 *
 * Este módulo envuelve `createClient()` con un contrato local explícito:
 * mismas tablas y columnas del migration real, pero tipadas a mano.
 * Cuando se regenere el tipo oficial, bastará con eliminar este archivo
 * y usar `createClient()` directamente.
 */

import { createClient as createUntypedClient } from "./server";
import type { Database } from "@/types/database.types";

type Tables = Database["public"]["Tables"];
type Functions = Database["public"]["Functions"];

export type ClientRow = Tables["clients"]["Row"];
export type ClientInsert = Tables["clients"]["Insert"];
export type ClientUpdate = Tables["clients"]["Update"];
export type DocumentRow = Tables["documents"]["Row"];
export type DocumentInsert = Tables["documents"]["Insert"];
export type DocumentUpdate = Tables["documents"]["Update"];
export type DocumentLineRow = Tables["document_lines"]["Row"];
export type DocumentLineInsert = Tables["document_lines"]["Insert"];
export type ProfileRow = Tables["profiles"]["Row"];
export type ProductRow = Tables["products"]["Row"];
export type ProductInsert = Tables["products"]["Insert"];
export type ProductUpdate = Tables["products"]["Update"];
export type ProductCategoryRow = Tables["product_categories"]["Row"];
export type StockMovementRow = Tables["stock_movements"]["Row"];
export type CompanySettingsRow = Tables["company_settings"]["Row"];
export type MetalPriceRow = Tables["metal_prices"]["Row"];
export type MetalPriceInsert = Tables["metal_prices"]["Insert"];
export type MetalType = "oro" | "plata";

type PostgrestError = { message: string; code?: string; details?: string };
type SingleResult<T> = Promise<{
  data: T | null;
  error: PostgrestError | null;
}>;
type ListResult<T> = Promise<{
  data: T[] | null;
  error: PostgrestError | null;
}>;

interface SelectBuilder<T>
  extends Promise<{ data: T[] | null; error: PostgrestError | null }> {
  eq(col: string, val: unknown): SelectBuilder<T>;
  in(col: string, val: unknown[]): SelectBuilder<T>;
  order(col: string, opts?: { ascending?: boolean }): SelectBuilder<T>;
  limit(n: number): SelectBuilder<T>;
  single(): SingleResult<T>;
  maybeSingle(): SingleResult<T>;
}

interface MutationBuilder {
  eq(col: string, val: unknown): Promise<{ error: PostgrestError | null }>;
  select(cols?: string): {
    single: () => SingleResult<{ id: string }>;
  };
}

interface DeleteBuilder {
  eq(col: string, val: unknown): Promise<{ error: PostgrestError | null }>;
}

interface ClientsTable {
  select(cols?: string): SelectBuilder<ClientRow>;
  insert(values: ClientInsert): {
    select(cols?: string): { single: () => SingleResult<{ id: string }> };
  };
  update(values: ClientUpdate): MutationBuilder;
}

interface DocumentsTable {
  select(cols?: string): SelectBuilder<DocumentRow>;
  insert(values: DocumentInsert): {
    select(cols?: string): { single: () => SingleResult<{ id: string }> };
  };
  update(values: DocumentUpdate): MutationBuilder;
  delete(): DeleteBuilder;
}

interface DocumentLinesTable {
  select(cols?: string): SelectBuilder<DocumentLineRow>;
  insert(
    values: DocumentLineInsert | DocumentLineInsert[]
  ): Promise<{ error: PostgrestError | null }>;
  delete(): DeleteBuilder;
}

interface ProfilesTable {
  select(cols?: string): SelectBuilder<ProfileRow>;
}

interface ProductsTable {
  select(cols?: string): SelectBuilder<ProductRow>;
  insert(values: ProductInsert): {
    select(cols?: string): { single: () => SingleResult<{ id: string }> };
  };
  update(values: ProductUpdate): MutationBuilder;
}

interface ProductCategoriesTable {
  select(cols?: string): SelectBuilder<ProductCategoryRow>;
}

interface StockMovementsTable {
  select(cols?: string): SelectBuilder<StockMovementRow>;
}

interface CompanySettingsTable {
  select(cols?: string): SelectBuilder<CompanySettingsRow>;
  update(values: Partial<CompanySettingsRow>): MutationBuilder;
}

interface MetalPricesTable {
  select(cols?: string): SelectBuilder<MetalPriceRow>;
}

type RecordStockMovementArgs = Functions["record_stock_movement"]["Args"];
type RecordStockMovementReturn = Functions["record_stock_movement"]["Returns"];
type EmitDocumentArgs = Functions["emit_document"]["Args"];
type EmitDocumentReturn = Functions["emit_document"]["Returns"];
type ConvertAlbaranArgs = Functions["convert_albaran_to_invoice"]["Args"];
type ConvertAlbaranReturn = Functions["convert_albaran_to_invoice"]["Returns"];
type ComputeProductPriceArgs = Functions["compute_product_price"]["Args"];
type ComputeProductPriceReturn = Functions["compute_product_price"]["Returns"];
type RecordMetalPriceArgs = Functions["record_metal_price"]["Args"];
type RecordMetalPriceReturn = Functions["record_metal_price"]["Returns"];
type CreateRectificationArgs = { original_id: string };
type CreateRectificationReturn = Tables["documents"]["Row"];
type DeleteDocumentArgs = { doc_id: string };

export interface TypedSupabase {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string; email?: string | null } | null };
    }>;
  };
  from(table: "clients"): ClientsTable;
  from(table: "documents"): DocumentsTable;
  from(table: "document_lines"): DocumentLinesTable;
  from(table: "profiles"): ProfilesTable;
  from(table: "products"): ProductsTable;
  from(table: "product_categories"): ProductCategoriesTable;
  from(table: "stock_movements"): StockMovementsTable;
  from(table: "company_settings"): CompanySettingsTable;
  from(table: "metal_prices"): MetalPricesTable;
  rpc(
    fn: "record_stock_movement",
    args: RecordStockMovementArgs
  ): SingleResult<RecordStockMovementReturn>;
  rpc(
    fn: "emit_document",
    args: EmitDocumentArgs
  ): SingleResult<EmitDocumentReturn>;
  rpc(
    fn: "convert_albaran_to_invoice",
    args: ConvertAlbaranArgs
  ): SingleResult<ConvertAlbaranReturn>;
  rpc(
    fn: "compute_product_price",
    args: ComputeProductPriceArgs
  ): SingleResult<ComputeProductPriceReturn>;
  rpc(
    fn: "record_metal_price",
    args: RecordMetalPriceArgs
  ): SingleResult<RecordMetalPriceReturn>;
  rpc(
    fn: "create_rectification_invoice",
    args: CreateRectificationArgs
  ): SingleResult<CreateRectificationReturn>;
  rpc(
    fn: "delete_document",
    args: DeleteDocumentArgs
  ): Promise<{ data: null; error: PostgrestError | null }>;
}

export function createTypedClient(): TypedSupabase {
  return createUntypedClient() as unknown as TypedSupabase;
}

// Utilidad para unused imports
void ({} as ListResult<unknown>);
