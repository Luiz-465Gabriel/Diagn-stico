import { registrarEvento } from "@/lib/eventos";
import { calcularProgresso, validarRespostas } from "@/lib/formulario/logica";
import type { FormSchema, RespostasMap } from "@/lib/formulario/tipos";
import { ipDaRequisicao, limitarPorIp } from "@/lib/rate-limit";
import { hashesIguais, hashToken } from "@/lib/tokens";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export type EnvioPublico = {
  id: string;
  status: string;
  expira_em: string;
  token_hash: string;
  cliente_id: string;
  schema: FormSchema;
  cliente_nome: string;
  respostas: RespostasMap;
  progresso_percentual: number;
  consentimento_lgpd_em: string | null;
  submitted_at: string | null;
  confirmacao: string;
  escritorio: string;
};

type RespostaLinha = {
  respostas: RespostasMap;
  progresso_percentual: number;
  consentimento_lgpd_em: string | null;
  submitted_at: string | null;
};

type LinhaEnvio = {
  id: string;
  status: string;
  expira_em: string;
  token_hash: string;
  cliente_id: string;
  clientes: { nome: string } | { nome: string }[] | null;
  form_templates: { schema: FormSchema } | { schema: FormSchema }[] | null;
  form_respostas: RespostaLinha | RespostaLinha[] | null;
};

function unico<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

export async function carregarEnvioPublico(token: string): Promise<{ envio: EnvioPublico | null; motivo?: string }> {
  const admin = criarClienteAdmin();
  const hash = hashToken(token);
  const { data, error } = await admin
    .from("form_envios")
    .select("id, status, expira_em, token_hash, cliente_id, clientes(nome), form_templates(schema), form_respostas(respostas, progresso_percentual, consentimento_lgpd_em, submitted_at)")
    .eq("token_hash", hash)
    .maybeSingle();
  if (error || !data) return { envio: null, motivo: "Este link não foi encontrado." };
  const linha = data as unknown as LinhaEnvio;
  if (!hashesIguais(linha.token_hash, hash)) return { envio: null, motivo: "Este link não foi encontrado." };

  let status = linha.status;
  if (status !== "cancelado" && status !== "respondido" && new Date(linha.expira_em).getTime() < Date.now()) {
    status = "expirado";
    await admin.from("form_envios").update({ status: "expirado" }).eq("id", linha.id);
  }
  if (status === "enviado") {
    status = "aberto";
    await admin.from("form_envios").update({ status: "aberto", aberto_em: new Date().toISOString() }).eq("id", linha.id);
    await registrarEvento(admin, { entidade: "form_envio", entidadeId: linha.id, acao: "formulario_aberto" });
  }

  const config = await admin.from("configuracoes_escritorio").select("razao_social").eq("id", 1).maybeSingle();
  const template = unico(linha.form_templates);
  const schema = template?.schema;
  if (!schema) return { envio: null, motivo: "O formulário não está disponível." };
  const respostas = unico(linha.form_respostas);
  const cliente = unico(linha.clientes);

  return {
    envio: {
      id: linha.id,
      status,
      expira_em: linha.expira_em,
      token_hash: linha.token_hash,
      cliente_id: linha.cliente_id,
      schema,
      cliente_nome: cliente?.nome ?? "você",
      respostas: respostas?.respostas ?? {},
      progresso_percentual: Number(respostas?.progresso_percentual ?? 0),
      consentimento_lgpd_em: respostas?.consentimento_lgpd_em ?? null,
      submitted_at: respostas?.submitted_at ?? null,
      confirmacao: schema.confirmacao,
      escritorio: (config.data as { razao_social?: string } | null)?.razao_social ?? "EMPMED Assessoria Contábil",
    },
  };
}

export function limitarFormulario(cabecalhos: Headers, sufixo: string) {
  const ip = ipDaRequisicao(cabecalhos);
  return limitarPorIp(`form:${sufixo}:${ip}`, 40, 60_000);
}

export async function salvarEnvioPublico(token: string, corpo: { respostas: RespostasMap; consentimento: boolean }, cabecalhos: Headers) {
  const limite = limitarFormulario(cabecalhos, "salvar");
  if (!limite.ok) return { ok: false as const, status: 429, erro: "Muitas tentativas. Espere um minuto e tente de novo." };
  const { envio } = await carregarEnvioPublico(token);
  if (!envio) return { ok: false as const, status: 404, erro: "Link inválido." };
  if (["respondido", "cancelado", "expirado"].includes(envio.status)) {
    return { ok: false as const, status: 409, erro: "Este formulário não aceita mais alterações." };
  }
  const admin = criarClienteAdmin();
  const progresso = calcularProgresso(envio.schema, corpo.respostas);
  const agora = new Date().toISOString();
  await admin.from("form_respostas").upsert({
    envio_id: envio.id,
    respostas: corpo.respostas,
    progresso_percentual: progresso,
    consentimento_lgpd_em: corpo.consentimento ? envio.consentimento_lgpd_em ?? agora : envio.consentimento_lgpd_em,
    ip: ipDaRequisicao(cabecalhos),
    user_agent: cabecalhos.get("user-agent")?.slice(0, 500) ?? null,
  }, { onConflict: "envio_id" });
  if (envio.status === "aberto" || envio.status === "enviado") {
    await admin.from("form_envios").update({ status: "em_andamento" }).eq("id", envio.id);
    await registrarEvento(admin, { entidade: "form_envio", entidadeId: envio.id, acao: "formulario_em_andamento" });
  }
  return { ok: true as const, progresso };
}

export async function concluirEnvioPublico(token: string, corpo: { respostas: RespostasMap }, cabecalhos: Headers) {
  const limite = limitarFormulario(cabecalhos, "enviar");
  if (!limite.ok) return { ok: false as const, status: 429, erro: "Muitas tentativas. Espere um minuto e tente de novo." };
  const { envio } = await carregarEnvioPublico(token);
  if (!envio) return { ok: false as const, status: 404, erro: "Link inválido." };
  if (envio.status === "respondido") return { ok: true as const, confirmacao: envio.confirmacao };
  if (["cancelado", "expirado"].includes(envio.status)) return { ok: false as const, status: 409, erro: "Este link não está mais ativo." };
  if (!envio.consentimento_lgpd_em) return { ok: false as const, status: 400, erro: "O aceite da LGPD é obrigatório." };
  const erros = validarRespostas(envio.schema, corpo.respostas);
  if (Object.keys(erros).length) return { ok: false as const, status: 422, erro: "Ainda há perguntas obrigatórias.", erros };
  const admin = criarClienteAdmin();
  const agora = new Date().toISOString();
  await admin.from("form_respostas").upsert({
    envio_id: envio.id,
    respostas: corpo.respostas,
    progresso_percentual: 100,
    submitted_at: agora,
    ip: ipDaRequisicao(cabecalhos),
    user_agent: cabecalhos.get("user-agent")?.slice(0, 500) ?? null,
    consentimento_lgpd_em: envio.consentimento_lgpd_em,
  }, { onConflict: "envio_id" });
  await admin.from("form_envios").update({ status: "respondido", respondido_em: agora }).eq("id", envio.id);
  await admin.from("clientes").update({ status_funil: "diagnostico_respondido" }).eq("id", envio.cliente_id);
  await registrarEvento(admin, { entidade: "form_envio", entidadeId: envio.id, acao: "formulario_respondido", dados: { cliente_id: envio.cliente_id } });
  return { ok: true as const, confirmacao: envio.confirmacao };
}
