"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { calcularDiagnostico } from "@/lib/diagnostico/motor";
import { parametrosDeLinhas, tributosVigentes, type LinhaTributo } from "@/lib/diagnostico/parametros";
import { montarEntrada, premissasPendentes, resolverPremissas, type PremissasDiagnostico } from "@/lib/diagnostico/premissas";
import { registrarEvento } from "@/lib/eventos";
import type { RespostasMap } from "@/lib/formulario/tipos";
import { dataHojeIso } from "@/lib/format";
import { VERSAO_MOTOR } from "@/lib/rotulos";
import { exigirSessao } from "@/lib/sessao";

async function carregarBases(supabase: Awaited<ReturnType<typeof exigirSessao>>["supabase"]) {
  const [{ data: parametrosLinhas }, { data: tributosLinhas }, { data: municipios }] = await Promise.all([
    supabase.from("parametros_diagnostico").select("chave, valor"),
    supabase.from("parametros_tributarios").select("id, regime, vigencia_inicio, vigencia_fim, parametros, fonte_legal"),
    supabase.from("parametros_municipais").select("municipio_uf, aliquota_iss").order("municipio_uf"),
  ]);
  const parametros = parametrosDeLinhas((parametrosLinhas ?? []) as { chave: string; valor: number }[]);
  const tributos = tributosVigentes((tributosLinhas ?? []) as LinhaTributo[], dataHojeIso());
  return {
    parametros,
    tributos,
    municipios: (municipios ?? []) as { municipio_uf: string; aliquota_iss: number }[],
  };
}

export async function gerarDiagnostico(envioId: string) {
  const { supabase, profile } = await exigirSessao();
  const { data } = await supabase
    .from("form_envios")
    .select("id, cliente_id, status, form_respostas(respostas)")
    .eq("id", envioId)
    .single();
  const envio = data as { id: string; cliente_id: string; status: string; form_respostas: { respostas: RespostasMap } | { respostas: RespostasMap }[] | null } | null;
  if (!envio || envio.status !== "respondido") return;
  const respostasLinha = Array.isArray(envio.form_respostas) ? envio.form_respostas[0] : envio.form_respostas;
  const bases = await carregarBases(supabase);
  const cidade = typeof respostasLinha?.respostas.q01_cidade?.valor === "string" ? respostasLinha.respostas.q01_cidade.valor : "";
  const municipio = bases.municipios.find((item) => cidade.toLowerCase().includes(item.municipio_uf.toLowerCase()) || item.municipio_uf.toLowerCase().includes(cidade.toLowerCase()));
  const premissas = resolverPremissas(respostasLinha?.respostas ?? {}, bases.parametros, {
    aliquotaIss: municipio ? Number(municipio.aliquota_iss) : 0,
    municipio: municipio?.municipio_uf || cidade,
  });
  const resultado = calcularDiagnostico(montarEntrada(premissas, bases.parametros, bases.tributos));
  const { data: criado, error } = await supabase
    .from("diagnosticos")
    .insert({
      cliente_id: envio.cliente_id,
      envio_id: envio.id,
      versao_motor: VERSAO_MOTOR,
      premissas,
      resultados: { ...resultado, fontes_legais: bases.tributos.fontes },
      alertas: resultado.alertas,
      status: "rascunho",
    })
    .select("id")
    .single();
  if (error || !criado) throw new Error(error?.message ?? "Não foi possível gerar o diagnóstico.");
  const id = (criado as { id: string }).id;
  await registrarEvento(supabase, { entidade: "diagnostico", entidadeId: id, acao: "diagnostico_gerado", usuarioId: profile.id, dados: { envio_id: envioId } });
  revalidatePath(`/formularios/envios/${envioId}`);
  redirect(`/diagnosticos/${id}`);
}

export async function salvarDiagnostico(id: string, premissas: PremissasDiagnostico, revisar: boolean) {
  const { supabase, profile } = await exigirSessao();
  if (revisar) {
    const pendentes = premissasPendentes(premissas);
    if (pendentes.length) return { erro: `Confirme as premissas: ${pendentes.join(", ")}.` };
  }
  const bases = await carregarBases(supabase);
  const resultado = calcularDiagnostico(montarEntrada(premissas, bases.parametros, bases.tributos));
  const { error } = await supabase
    .from("diagnosticos")
    .update({
      premissas,
      resultados: { ...resultado, fontes_legais: bases.tributos.fontes },
      alertas: resultado.alertas,
      versao_motor: VERSAO_MOTOR,
      status: revisar ? "revisado" : "rascunho",
      revisado_por: revisar ? profile.id : null,
      revisado_em: revisar ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return { erro: error.message };
  await registrarEvento(supabase, {
    entidade: "diagnostico",
    entidadeId: id,
    acao: revisar ? "diagnostico_revisado" : "diagnostico_salvo",
    usuarioId: profile.id,
  });
  revalidatePath(`/diagnosticos/${id}`);
  return { ok: true };
}

export async function reabrirDiagnostico(id: string) {
  const { supabase, profile } = await exigirSessao();
  await supabase.from("diagnosticos").update({ status: "rascunho", revisado_em: null, revisado_por: null }).eq("id", id);
  await registrarEvento(supabase, { entidade: "diagnostico", entidadeId: id, acao: "diagnostico_reaberto", usuarioId: profile.id });
  revalidatePath(`/diagnosticos/${id}`);
}
