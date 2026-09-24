"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/rotulos";

export async function entrar(formData: FormData) {
  if (!supabaseConfigurado()) {
    return { erro: "Configure o Supabase no arquivo .env.local antes de entrar." };
  }
  const email = String(formData.get("email") || "").trim();
  const senha = String(formData.get("senha") || "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: "E-mail ou senha incorretos." };
  redirect("/dashboard");
}

export async function sair() {
  if (supabaseConfigurado()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
