import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerSessaoLocal } from "@/lib/supabase/sessao-local";

export default async function Inicio() {
  const jar = await cookies();
  const usuario = lerSessaoLocal(jar.getAll(), process.env.NEXT_PUBLIC_SUPABASE_URL);
  redirect(usuario ? "/dashboard" : "/login");
}
