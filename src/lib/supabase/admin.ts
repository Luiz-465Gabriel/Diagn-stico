import { createClient } from "@supabase/supabase-js";
import { adminConfigurado } from "@/lib/rotulos";

/** Cliente com service role. Só pode ser importado em código de servidor. */
export function criarClienteAdmin() {
  if (!adminConfigurado()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
