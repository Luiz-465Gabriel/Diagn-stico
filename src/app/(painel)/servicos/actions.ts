"use server";

import { revalidatePath } from "next/cache";
import { registrarEvento } from "@/lib/eventos";
import { exigirSessao } from "@/lib/sessao";

export async function salvarServico(formData: FormData) {
  const { supabase, profile } = await exigirSessao();
  const id = String(formData.get("id") || "");
  const linha = {
    nome: String(formData.get("nome") || "").trim(),
    descricao: String(formData.get("descricao") || "").trim() || null,
    tipo: String(formData.get("tipo") || "avulso"),
    valor_base: Number(formData.get("valor_base") || 0),
    ordem: Number(formData.get("ordem") || 0),
    ativo: formData.get("ativo") === "on",
  };
  if (!linha.nome) return;
  if (id) await supabase.from("servicos").update(linha).eq("id", id);
  else {
    const { data } = await supabase.from("servicos").insert(linha).select("id").single();
    await registrarEvento(supabase, { entidade: "servico", entidadeId: (data as { id: string } | null)?.id, acao: "servico_criado", usuarioId: profile.id });
  }
  revalidatePath("/servicos");
}

export async function salvarMapa(formData: FormData) {
  const { supabase, profile } = await exigirSessao();
  const prioridade = String(formData.get("prioridade") || "");
  const servicoId = String(formData.get("servico_id") || "");
  if (!prioridade || !servicoId) return;
  await supabase.from("mapa_prioridade_servico").insert({ prioridade, servico_id: servicoId });
  await registrarEvento(supabase, { entidade: "mapa_prioridade", acao: "mapa_atualizado", usuarioId: profile.id, dados: { prioridade, servicoId } });
  revalidatePath("/servicos");
}

export async function removerMapa(formData: FormData) {
  const { supabase } = await exigirSessao();
  const id = String(formData.get("id") || "");
  if (id) await supabase.from("mapa_prioridade_servico").delete().eq("id", id);
  revalidatePath("/servicos");
}
