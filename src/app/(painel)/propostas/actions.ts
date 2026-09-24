"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { registrarEvento } from "@/lib/eventos";
import { enviarEmail, emailHabilitado } from "@/lib/email";
import { totalizarItens, type ItemEntrada } from "@/lib/proposta/totais";
import { CONDICOES_PAGAMENTO_PADRAO, ESCOPO_INCLUSO_PADRAO, ESCOPO_NAO_INCLUSO_PADRAO, urlPublica, VALIDADE_PROPOSTA_DIAS } from "@/lib/rotulos";
import { exigirSessao } from "@/lib/sessao";
import { gerarToken } from "@/lib/tokens";

export async function criarProposta(entrada: {
  clienteId: string;
  diagnosticoId: string;
  envioId: string | null;
  itens: ItemEntrada[];
  validadeDias: number;
  condicoes: string;
  escopoIncluso: string;
  escopoNaoIncluso: string;
  observacoes: string;
}) {
  const { supabase, profile } = await exigirSessao();
  const { data: diagnostico } = await supabase.from("diagnosticos").select("status").eq("id", entrada.diagnosticoId).single();
  if ((diagnostico as { status: string } | null)?.status !== "revisado") {
    return { erro: "Revise o diagnóstico antes de montar a proposta." };
  }
  const totais = totalizarItens(entrada.itens.filter((item) => item.descricao.trim()));
  const { data: numeroData, error: erroNumero } = await supabase.rpc("proximo_numero_proposta");
  if (erroNumero || !numeroData) return { erro: erroNumero?.message ?? "Não foi possível numerar a proposta." };
  const { data, error } = await supabase
    .from("propostas")
    .insert({
      numero: numeroData as string,
      cliente_id: entrada.clienteId,
      envio_id: entrada.envioId,
      diagnostico_id: entrada.diagnosticoId,
      status: "rascunho",
      validade_dias: entrada.validadeDias || VALIDADE_PROPOSTA_DIAS,
      total_mensal: totais.total_mensal,
      total_avulso: totais.total_avulso,
      condicoes_pagamento: entrada.condicoes || CONDICOES_PAGAMENTO_PADRAO,
      escopo_incluso: entrada.escopoIncluso || ESCOPO_INCLUSO_PADRAO,
      escopo_nao_incluso: entrada.escopoNaoIncluso || ESCOPO_NAO_INCLUSO_PADRAO,
      observacoes: entrada.observacoes || null,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error || !data) return { erro: error?.message ?? "Não foi possível criar a proposta." };
  const id = (data as { id: string }).id;
  if (totais.itens.length) {
    const { error: erroItens } = await supabase.from("proposta_itens").insert(
      totais.itens.map((item, ordem) => ({
        proposta_id: id,
        servico_id: item.servico_id || null,
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        desconto: item.desconto,
        valor_total: item.valor_total,
        tipo: item.tipo,
        ordem,
        prioridade_origem: item.prioridade_origem || null,
      })),
    );
    if (erroItens) return { erro: erroItens.message };
  }
  await registrarEvento(supabase, { entidade: "proposta", entidadeId: id, acao: "proposta_criada", usuarioId: profile.id });
  revalidatePath("/propostas");
  redirect(`/propostas/${id}`);
}

export async function enviarProposta(propostaId: string) {
  const { supabase, profile } = await exigirSessao();
  const { data } = await supabase.from("propostas").select("id, diagnosticos(status), validade_dias, numero, clientes(nome)").eq("id", propostaId).single();
  const proposta = data as { diagnosticos: { status: string } | { status: string }[] | null; validade_dias: number; numero: string } | null;
  const diagnostico = Array.isArray(proposta?.diagnosticos) ? proposta?.diagnosticos[0] : proposta?.diagnosticos;
  if (diagnostico?.status !== "revisado") return { erro: "O diagnóstico ainda está em rascunho. O PDF e o envio ficam bloqueados." };
  const { token, hash } = gerarToken();
  const { error } = await supabase.from("propostas").update({
    status: "enviada",
    token_hash_aceite: hash,
    enviada_em: new Date().toISOString(),
  }).eq("id", propostaId);
  if (error) return { erro: error.message };
  const clienteId = (await supabase.from("propostas").select("cliente_id").eq("id", propostaId).single()).data as { cliente_id: string } | null;
  if (clienteId) await supabase.from("clientes").update({ status_funil: "proposta_enviada" }).eq("id", clienteId.cliente_id);
  await registrarEvento(supabase, { entidade: "proposta", entidadeId: propostaId, acao: "proposta_enviada", usuarioId: profile.id });
  revalidatePath(`/propostas/${propostaId}`);
  return { url: urlPublica(`/p/${token}`), validade: proposta?.validade_dias ?? VALIDADE_PROPOSTA_DIAS, numero: proposta?.numero ?? "" };
}

export async function enviarPropostaEmail(propostaId: string, url: string) {
  if (!emailHabilitado()) return { erro: "E-mail desligado. Configure RESEND_API_KEY e EMAIL_FROM." };
  const { supabase, profile } = await exigirSessao();
  const { data } = await supabase.from("propostas").select("numero, clientes(nome, email)").eq("id", propostaId).single();
  const linha = data as { numero: string; clientes: { nome: string; email: string | null } | { nome: string; email: string | null }[] } | null;
  const cliente = Array.isArray(linha?.clientes) ? linha?.clientes[0] : linha?.clientes;
  if (!cliente?.email) return { erro: "O cliente não tem e-mail." };
  const resultado = await enviarEmail({
    para: cliente.email,
    assunto: `Proposta EMPMED ${linha?.numero ?? ""}`,
    html: `<p>Olá, ${cliente.nome}.</p><p>Sua proposta está pronta: <a href="${url}">${url}</a></p>`,
  });
  if (!resultado.ok) return { erro: resultado.motivo };
  await registrarEvento(supabase, { entidade: "proposta", entidadeId: propostaId, acao: "proposta_email", usuarioId: profile.id });
  return { ok: true };
}
