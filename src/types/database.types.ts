/**
 * TODO: regenerar con `supabase gen types typescript --project-id <id> > src/types/database.types.ts`
 * Este archivo es un placeholder mínimo para que el tipado compile en Fase 1/2.
 * Los tipos reales deben derivarse del esquema en supabase/migrations/*.sql.
 */

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: "admin" | "contabilidad";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: "admin" | "contabilidad";
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: Relationship[];
      };
      clients: {
        Row: {
          id: string;
          type: "particular" | "empresa";
          name: string;
          tax_id: string | null;
          contact_name: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          city: string | null;
          postal_code: string | null;
          country: string | null;
          price_tier: "A" | "B" | "C" | "especial";
          notes: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type?: "particular" | "empresa";
          name: string;
          tax_id?: string | null;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          postal_code?: string | null;
          country?: string | null;
          price_tier?: "A" | "B" | "C" | "especial";
          notes?: string | null;
          active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
        Relationships: Relationship[];
      };
      products: {
        Row: {
          id: string;
          sku: string | null;
          name: string;
          description: string | null;
          type: "producto" | "servicio";
          category_id: string | null;
          metal: "oro" | "plata";
          weight_g: number;
          purity: number;
          markup_per_gram: number;
          markup_per_piece: number;
          cost_price: number;
          stock_current: number;
          stock_min: number;
          igic_rate: number | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sku?: string | null;
          name: string;
          description?: string | null;
          type?: "producto" | "servicio";
          category_id?: string | null;
          metal: "oro" | "plata";
          weight_g?: number;
          purity?: number;
          markup_per_gram?: number;
          markup_per_piece?: number;
          cost_price?: number;
          stock_current?: number;
          stock_min?: number;
          igic_rate?: number | null;
          active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: Relationship[];
      };
      metal_prices: {
        Row: {
          id: string;
          metal: "oro" | "plata";
          price_eur_per_g: number;
          fetched_at: string;
          source: string;
        };
        Insert: {
          id?: string;
          metal: "oro" | "plata";
          price_eur_per_g: number;
          fetched_at?: string;
          source?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["metal_prices"]["Insert"]
        >;
        Relationships: Relationship[];
      };
      product_categories: {
        Row: {
          id: string;
          name: string;
          igic_rate: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          igic_rate?: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["product_categories"]["Insert"]
        >;
        Relationships: Relationship[];
      };
      company_settings: {
        Row: {
          id: number;
          legal_name: string | null;
          trade_name: string | null;
          tax_id: string | null;
          address: string | null;
          city: string | null;
          postal_code: string | null;
          country: string | null;
          email: string | null;
          phone: string | null;
          website: string | null;
          iban: string | null;
          default_igic_rate: number;
          default_payment_days: number;
          invoice_footer: string | null;
          metal_markup_pct: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["company_settings"]["Row"]
        > & { id?: number };
        Update: Partial<
          Database["public"]["Tables"]["company_settings"]["Insert"]
        >;
        Relationships: Relationship[];
      };
      stock_movements: {
        Row: {
          id: string;
          product_id: string;
          movement_type: "entrada" | "salida" | "ajuste";
          quantity: number;
          document_id: string | null;
          reason: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          movement_type: "entrada" | "salida" | "ajuste";
          quantity: number;
          document_id?: string | null;
          reason?: string | null;
          created_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["stock_movements"]["Insert"]
        >;
        Relationships: Relationship[];
      };
      documents: {
        Row: {
          id: string;
          doc_type: "albaran" | "factura";
          status:
            | "borrador"
            | "emitido"
            | "pagado"
            | "vencido"
            | "cancelado"
            | "convertido"
            | "rectificada";
          series_id: string | null;
          number: number | null;
          code: string | null;
          client_id: string;
          issue_date: string;
          due_date: string | null;
          notes: string | null;
          subtotal: number;
          igic_total: number;
          total: number;
          converted_to_invoice_id: string | null;
          source_albaran_id: string | null;
          rectification_of_invoice_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          doc_type: "albaran" | "factura";
          status?:
            | "borrador"
            | "emitido"
            | "pagado"
            | "vencido"
            | "cancelado"
            | "convertido"
            | "rectificada";
          client_id: string;
          issue_date?: string;
          due_date?: string | null;
          notes?: string | null;
          subtotal?: number;
          igic_total?: number;
          total?: number;
          rectification_of_invoice_id?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
        Relationships: Relationship[];
      };
      document_lines: {
        Row: {
          id: string;
          document_id: string;
          position: number;
          product_id: string | null;
          description: string;
          quantity: number;
          unit_price: number;
          discount_pct: number;
          igic_rate: number;
          line_subtotal: number;
          line_igic: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          position?: number;
          product_id?: string | null;
          description: string;
          quantity?: number;
          unit_price?: number;
          discount_pct?: number;
          igic_rate?: number;
          line_subtotal?: number;
          line_igic?: number;
          line_total?: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["document_lines"]["Insert"]
        >;
        Relationships: Relationship[];
      };
    };
    Views: Record<
      string,
      { Row: Record<string, unknown>; Relationships: Relationship[] }
    >;
    Functions: {
      record_stock_movement: {
        Args: {
          p_product_id: string;
          p_movement_type: "entrada" | "salida" | "ajuste";
          p_quantity: number;
          p_reason?: string | null;
          p_document_id?: string | null;
        };
        Returns: Database["public"]["Tables"]["stock_movements"]["Row"];
      };
      emit_document: {
        Args: { doc_id: string };
        Returns: Database["public"]["Tables"]["documents"]["Row"];
      };
      convert_albaran_to_invoice: {
        Args: { albaran_id: string };
        Returns: Database["public"]["Tables"]["documents"]["Row"];
      };
      compute_product_price: {
        Args: { p_id: string };
        Returns: number;
      };
      record_metal_price: {
        Args: {
          p_metal: "oro" | "plata";
          p_price: number;
          p_source?: string;
        };
        Returns: Database["public"]["Tables"]["metal_prices"]["Row"];
      };
    };
    Enums: {
      user_role: "admin" | "contabilidad";
      client_type: "particular" | "empresa";
      price_tier: "A" | "B" | "C" | "especial";
      product_type: "producto" | "servicio";
      doc_type: "albaran" | "factura";
      doc_status:
        | "borrador"
        | "emitido"
        | "pagado"
        | "vencido"
        | "cancelado"
        | "convertido"
        | "rectificada";
      movement_type: "entrada" | "salida" | "ajuste";
      metal_type: "oro" | "plata";
    };
    CompositeTypes: Record<string, Record<string, unknown>>;
  };
}
