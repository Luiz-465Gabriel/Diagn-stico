import type { ParametroPF, ParametroPresumido, ParametroSimples, ParametrosCalculo } from "@/lib/diagnostico/tipos";

export const CHAVES_PARAMETROS = [
  "semanas_por_mes",
  "ocupacao_maxima_saudavel",
  "taxa_cartao_media",
  "inadimplencia_estimada",
  "meses_rampa",
  "crescimento_mensal_pacientes",
  "meses_capital_de_giro",
  "meses_reserva_pessoal",
  "margem_seguranca_cenario_ideal",
  "reducao_cenario_conservador",
  "honorario_contabil_padrao",
  "limite_premissas_estimadas_alerta",
  "ocupacao_alerta_alta",
  "ocupacao_alerta_media",
  "limite_parcelas_sobre_receita",
  "gastos_mensais_sugeridos",
  "dias_semana_padrao",
  "horas_dia_padrao",
  "pessoas_grupo_padrao",
] as const;

export function parametrosDeLinhas(linhas: { chave: string; valor: number | string }[]): ParametrosCalculo {
  const mapa = Object.fromEntries(linhas.map((linha) => [linha.chave, Number(linha.valor)]));
  const faltando = CHAVES_PARAMETROS.filter((chave) => !Number.isFinite(mapa[chave]));
  if (faltando.length) {
    throw new Error(`Parâmetros de diagnóstico ausentes: ${faltando.join(", ")}`);
  }
  return Object.fromEntries(CHAVES_PARAMETROS.map((chave) => [chave, mapa[chave]])) as ParametrosCalculo;
}

export type LinhaTributo = {
  id: string;
  regime: string;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  parametros: Record<string, unknown>;
  fonte_legal: string;
};

function vigente(linhas: LinhaTributo[], regime: string, hoje: string) {
  return linhas
    .filter((linha) => linha.regime === regime && linha.vigencia_inicio <= hoje && (!linha.vigencia_fim || linha.vigencia_fim >= hoje))
    .sort((a, b) => b.vigencia_inicio.localeCompare(a.vigencia_inicio))[0];
}

export function tributosVigentes(linhas: LinhaTributo[], hoje: string) {
  const pf = vigente(linhas, "PF_CARNE_LEAO", hoje);
  const iii = vigente(linhas, "SIMPLES_ANEXO_III", hoje);
  const v = vigente(linhas, "SIMPLES_ANEXO_V", hoje);
  const presumido = vigente(linhas, "LUCRO_PRESUMIDO", hoje);
  if (!pf || !iii || !v || !presumido) {
    throw new Error("Falta parâmetro tributário vigente para PF, Simples Anexo III, Anexo V ou Lucro Presumido.");
  }
  return {
    pf: pf.parametros as unknown as ParametroPF,
    simplesIII: iii.parametros as unknown as ParametroSimples,
    simplesV: v.parametros as unknown as ParametroSimples,
    presumido: presumido.parametros as unknown as ParametroPresumido,
    fontes: [pf, iii, v, presumido].map((linha) => ({ regime: linha.regime, fonte: linha.fonte_legal })),
  };
}
