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

function idDoToken(accessToken: string | undefined) {
  if (!accessToken) return null;
  const parte = accessToken.split(".")[1];
  if (!parte) return null;
  try {
    const claims = JSON.parse(Buffer.from(parte, "base64url").toString("utf8")) as { sub?: string };
    return claims.sub ?? null;
  } catch {
    return null;
  }
}

/** Cliente autenticado pelo cookie. Não consulta o servidor de login. */
export const exigirCliente = cache(async function exigirCliente() {
  if (!supabaseConfigurado()) redirect("/sem-configuracao");
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  const userId = idDoToken(data.session?.access_token);
  if (!userId) redirect("/login");
  return { supabase, userId };
});

export const obterSessao = cache(async function obterSessao() {
  if (!supabaseConfigurado()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  const userId = idDoToken(data.session?.access_token);
  if (!userId) return null;
  const perfilResp = await supabase.from("profiles").select("id, nome, email, perfil, ativo").eq("id", userId).maybeSingle();
  const profile = perfilResp.data as Perfil | null;
  if (!profile?.ativo) return null;
  return { supabase, userId, profile };
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
