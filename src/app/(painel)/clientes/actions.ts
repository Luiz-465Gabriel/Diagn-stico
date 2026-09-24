"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { registrarEvento } from "@/lib/eventos";
import { clienteSchema } from "@/lib/clientes/schema";
import { somenteDigitos } from "@/lib/cpf-cnpj";
import { exigirSessao } from "@/lib/sessao";

export async function salvarCliente(id: string | null, entrada: unknown) {
  const { supabase, profile } = await exigirSessao();
  const dados = clienteSchema.parse(entrada);
  const linha = {
    tipo: dados.tipo,
    nome: dados.nome,
    razao_social: dados.razao_social?.trim() || null,
    cpf_cnpj: somenteDigitos(dados.cpf_cnpj),
    email: dados.email?.trim() || null,
    whatsapp: somenteDigitos(dados.whatsapp || "") || null,
    profissao_especialidade: dados.profissao_especialidade?.trim() || null,
    cidade_uf: dados.cidade_uf?.trim() || null,
    origem_lead: dados.origem_lead?.trim() || null,
    responsavel_id: dados.responsavel_id || null,
    status_funil: dados.status_funil,
    observacoes: dados.observacoes?.trim() || null,
  };
  if (id) {
    const { error } = await supabase.from("clientes").update(linha).eq("id", id);
    if (error) return { erro: error.message.includes("duplicate") ? "Já existe cliente com este CPF/CNPJ." : error.message };
    await registrarEvento(supabase, { entidade: "cliente", entidadeId: id, acao: "cliente_atualizado", usuarioId: profile.id });
    revalidatePath(`/clientes/${id}`);
    revalidatePath("/clientes");
    redirect(`/clientes/${id}`);
  }
  const { data, error } = await supabase.from("clientes").insert(linha).select("id").single();
  if (error || !data) return { erro: error?.message.includes("duplicate") ? "Já existe cliente com este CPF/CNPJ." : error?.message ?? "Não foi possível salvar." };
  const criado = data as { id: string };
  await registrarEvento(supabase, { entidade: "cliente", entidadeId: criado.id, acao: "cliente_criado", usuarioId: profile.id });
  revalidatePath("/clientes");
  redirect(`/clientes/${criado.id}`);
}

export async function excluirCliente(id: string) {
  const { supabase, profile } = await exigirSessao();
  if (profile.perfil !== "admin") {
    redirect(`/clientes/${id}/editar?erro=${encodeURIComponent("Somente a administração pode excluir.")}`);
  }
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) {
    redirect(`/clientes/${id}/editar?erro=${encodeURIComponent("Não foi possível excluir. O cliente pode ter formulários ou propostas.")}`);
  }
  await registrarEvento(supabase, { entidade: "cliente", entidadeId: id, acao: "cliente_excluido", usuarioId: profile.id });
  revalidatePath("/clientes");
  redirect("/clientes");
}
