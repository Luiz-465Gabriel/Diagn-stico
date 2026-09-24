import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/rotulos";

export type Perfil = {
  id: string;
  nome: string;
  email: string;
  perfil: "admin" | "colaborador";
  ativo: boolean;
};

export const obterSessao = cache(async function obterSessao() {
  if (!supabaseConfigurado()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const perfilResp = await supabase.from("profiles").select("id, nome, email, perfil, ativo").eq("id", data.user.id).maybeSingle();
  const profile = perfilResp.data as Perfil | null;
  if (!profile?.ativo) return null;
  return { supabase, user: data.user, profile };
});

export async function exigirSessao() {
  if (!supabaseConfigurado()) redirect("/sem-configuracao");
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");
  return sessao;
}

export async function exigirAdmin() {
  const sessao = await exigirSessao();
  if (sessao.profile.perfil !== "admin") redirect("/dashboard");
  return sessao;
}
