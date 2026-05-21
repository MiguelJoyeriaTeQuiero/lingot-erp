import { createClient } from "@supabase/supabase-js";
import type { TypedSupabase } from "./typed";

/**
 * Cliente Supabase con service role key — bypassa RLS.
 * Usar solo en Server Actions tras verificar autenticación del usuario.
 */
export function createAdminClient(): TypedSupabase {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  ) as unknown as TypedSupabase;
}

/**
 * Cliente raw con service role — expone auth.admin.* para gestión de usuarios.
 */
export function createRawAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
