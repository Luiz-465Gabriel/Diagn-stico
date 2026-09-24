"use server";

import { revalidatePath } from "next/cache";
import { registrarEvento } from "@/lib/eventos";
import { enviarEmail, emailHabilitado } from "@/lib/email";
import { NOME_TEMPLATE, VERSAO_TEMPLATE } from "@/lib/formulario/template-v1";
import { VALIDADE_FORMULARIO_DIAS, urlPublica } from "@/lib/rotulos";
import { exigirSessao } from "@/lib/sessao";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { gerarToken } from "@/lib/tokens";

export async function garantirTemplate() {
  const { supabase } = await exigirSessao();
  const { data } = await supabase.from("form_templates").select("id").eq("nome", NOME_TEMPLATE).eq("versao", VERSAO_TEMPLATE).maybeSingle();
  if (data) return data as { id: string };
  const { TEMPLATE_PLANEJAMENTO_V1 } = await import("@/lib/formulario/template-v1");
  const admin = criarClienteAdmin();
  const { data: criado, error } = await admin
    .from("form_templates")
    .insert({
      nome: NOME_TEMPLATE,
      descricao: "Formulário de planejamento do novo espaço.",
      versao: VERSAO_TEMPLATE,
      schema: TEMPLATE_PLANEJAMENTO_V1,
      ativo: true,
    })
    .select("id")
    .single();
  if (error || !criado) throw new Error(error?.message ?? "Não foi possível criar o template.");
  return criado as { id: string };
}

export async function criarEnvio(clienteId: string) {
  const { supabase, profile } = await exigirSessao();
  const template = await garantirTemplate();
  const { token, hash } = gerarToken();
  const expira = new Date(Date.now() + VALIDADE_FORMULARIO_DIAS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("form_envios")
    .insert({
      cliente_id: clienteId,
      template_id: template.id,
      versao_template: VERSAO_TEMPLATE,
      token_hash: hash,
      expira_em: expira,
      status: "enviado",
      canal: "link",
      enviado_em: new Date().toISOString(),
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error || !data) return { erro: error?.message ?? "Não foi possível gerar o link." };
  const envio = data as { id: string };
  await supabase.from("form_respostas").insert({ envio_id: envio.id, respostas: {}, progresso_percentual: 0 });
  await supabase.from("clientes").update({ status_funil: "diagnostico_enviado" }).eq("id", clienteId).eq("status_funil", "lead");
  await registrarEvento(supabase, { entidade: "form_envio", entidadeId: envio.id, acao: "formulario_criado", usuarioId: profile.id, dados: { cliente_id: clienteId } });
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/formularios");
  return { url: urlPublica(`/f/${token}`), envioId: envio.id };
}

export async function reenviarEnvio(envioId: string) {
  const { supabase, profile } = await exigirSessao();
  const { token, hash } = gerarToken();
  const { data } = await supabase.from("form_envios").select("cliente_id, status").eq("id", envioId).single();
  const atual = data as { cliente_id: string; status: string } | null;
  if (!atual || atual.status === "respondido") return { erro: "Não é possível trocar o link de um formulário já respondido." };
  const expira = new Date(Date.now() + VALIDADE_FORMULARIO_DIAS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("form_envios").update({ token_hash: hash, expira_em: expira, status: "enviado", enviado_em: new Date().toISOString() }).eq("id", envioId);
  if (error) return { erro: error.message };
  await registrarEvento(supabase, { entidade: "form_envio", entidadeId: envioId, acao: "formulario_reenviado", usuarioId: profile.id });
  revalidatePath(`/formularios/envios/${envioId}`);
  return { url: urlPublica(`/f/${token}`) };
}

export async function prorrogarEnvio(envioId: string, dias: number) {
  const { supabase, profile } = await exigirSessao();
  const { data } = await supabase.from("form_envios").select("expira_em, status").eq("id", envioId).single();
  const atual = data as { expira_em: string; status: string } | null;
  if (!atual) return { erro: "Envio não encontrado." };
  const base = Math.max(Date.now(), new Date(atual.expira_em).getTime());
  const expira = new Date(base + dias * 24 * 60 * 60 * 1000).toISOString();
  const status = atual.status === "expirado" ? "em_andamento" : atual.status;
  const { error } = await supabase.from("form_envios").update({ expira_em: expira, status }).eq("id", envioId);
  if (error) return { erro: error.message };
  await registrarEvento(supabase, { entidade: "form_envio", entidadeId: envioId, acao: "formulario_prorrogado", usuarioId: profile.id, dados: { dias } });
  revalidatePath(`/formularios/envios/${envioId}`);
  return { ok: true };
}

export async function cancelarEnvio(envioId: string) {
  const { supabase, profile } = await exigirSessao();
  const { error } = await supabase.from("form_envios").update({ status: "cancelado" }).eq("id", envioId);
  if (error) return { erro: error.message };
  await registrarEvento(supabase, { entidade: "form_envio", entidadeId: envioId, acao: "formulario_cancelado", usuarioId: profile.id });
  revalidatePath(`/formularios/envios/${envioId}`);
  return { ok: true };
}

export async function reabrirEnvio(envioId: string) {
  const { supabase, profile } = await exigirSessao();
  const { data } = await supabase.from("form_envios").select("cliente_id").eq("id", envioId).single();
  const { error } = await supabase.from("form_envios").update({ status: "em_andamento", respondido_em: null }).eq("id", envioId);
  if (error) return { erro: error.message };
  await supabase.from("form_respostas").update({ submitted_at: null }).eq("envio_id", envioId);
  const cliente = data as { cliente_id: string } | null;
  if (cliente) await supabase.from("clientes").update({ status_funil: "diagnostico_enviado" }).eq("id", cliente.cliente_id).eq("status_funil", "diagnostico_respondido");
  await registrarEvento(supabase, { entidade: "form_envio", entidadeId: envioId, acao: "formulario_reaberto", usuarioId: profile.id });
  revalidatePath(`/formularios/envios/${envioId}`);
  return { ok: true };
}

export async function enviarFormularioEmail(envioId: string, url: string) {
  if (!emailHabilitado()) return { erro: "E-mail desligado. Configure RESEND_API_KEY e EMAIL_FROM." };
  const { supabase, profile } = await exigirSessao();
  const { data } = await supabase.from("form_envios").select("clientes(nome, email)").eq("id", envioId).single();
  const cliente = (data as { clientes: { nome: string; email: string | null } | { nome: string; email: string | null }[] } | null)?.clientes;
  const pessoa = Array.isArray(cliente) ? cliente[0] : cliente;
  if (!pessoa?.email) return { erro: "O cliente não tem e-mail cadastrado." };
  const resultado = await enviarEmail({
    para: pessoa.email,
    assunto: "Planejamento do seu novo espaço — EMPMED",
    html: `<p>Olá, ${pessoa.nome}.</p><p>Segue o formulário para planejarmos o seu novo espaço. Leva cerca de 5 a 8 minutos:</p><p><a href="${url}">${url}</a></p>`,
  });
  if (!resultado.ok) return { erro: resultado.motivo };
  await supabase.from("form_envios").update({ canal: "email" }).eq("id", envioId);
  await registrarEvento(supabase, { entidade: "form_envio", entidadeId: envioId, acao: "formulario_email", usuarioId: profile.id });
  return { ok: true };
}

export async function registrarCanalWhatsapp(envioId: string) {
  const { supabase, profile } = await exigirSessao();
  await supabase.from("form_envios").update({ canal: "whatsapp" }).eq("id", envioId);
  await registrarEvento(supabase, { entidade: "form_envio", entidadeId: envioId, acao: "formulario_whatsapp", usuarioId: profile.id });
}
