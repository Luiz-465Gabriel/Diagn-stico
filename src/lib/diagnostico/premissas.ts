import type {
  AtividadeTributaria,
  CampoNumero,
  EntradaDiagnostico,
  OrigemPremissa,
  ParametrosCalculo,
  Qualitativo,
  RegimeId,
  ServicoInformado,
} from "@/lib/diagnostico/tipos";
import type { RespostasMap } from "@/lib/formulario/tipos";

export type CampoTexto = {
  valor: string;
  origem: OrigemPremissa;
  confirmado: boolean;
};

export type PremissasDiagnostico = {
  dias_semana: CampoNumero;
  horas_dia: CampoNumero;
  pacientes_inicio: CampoNumero;
  sessoes_por_paciente_mes: CampoNumero;
  pessoas_por_horario_grupo: CampoNumero;
  servicos: { valor: ServicoInformado[]; origem: OrigemPremissa; confirmado: boolean };
  aluguel: CampoNumero;
  gastos_mensais: CampoNumero;
  remuneracao_fixa: CampoNumero;
  percentual_remuneracao: CampoNumero;
  honorario_contabil: CampoNumero;
  parcelas_dividas: CampoNumero;
  retirada_mensal: CampoNumero;
  equipamentos: CampoNumero;
  reforma: CampoNumero;
  recursos_proprios: CampoNumero;
  financiamento: CampoNumero;
  reserva: CampoNumero;
  despesas_dedutiveis_mensais: CampoNumero;
  pro_labore_mensal: CampoNumero;
  aliquota_iss: CampoNumero;
  atividade: { valor: AtividadeTributaria; origem: OrigemPremissa; confirmado: boolean };
  municipio_uf: CampoTexto;
  regime_adotado: { valor: RegimeId | "menor_carga"; origem: OrigemPremissa; confirmado: boolean };
  qualitativo: Qualitativo;
  percentual_estimadas: number;
};

function campo(valor: number, origem: OrigemPremissa, naoSabe = false): CampoNumero {
  return {
    valor,
    origem,
    confirmado: origem !== "estimado",
    nao_sabe: naoSabe,
  };
}

function lerNumero(
  respostas: RespostasMap,
  id: string,
  fallback: number,
): { valor: number; origem: OrigemPremissa; naoSabe: boolean } {
  const resposta = respostas[id];
  if (!resposta || resposta.nao_sabe || resposta.valor === null || resposta.valor === "") {
    return { valor: fallback, origem: "estimado", naoSabe: Boolean(resposta?.nao_sabe) };
  }
  const numero = typeof resposta.valor === "number" ? resposta.valor : Number(resposta.valor);
  if (!Number.isFinite(numero)) return { valor: fallback, origem: "estimado", naoSabe: true };
  return { valor: numero, origem: "cliente", naoSabe: false };
}

function lerTexto(respostas: RespostasMap, id: string): string | null {
  const valor = respostas[id]?.valor;
  if (typeof valor !== "string") return null;
  const texto = valor.trim();
  return texto ? texto : null;
}

function lerLista(respostas: RespostasMap, id: string): string[] {
  const valor = respostas[id]?.valor;
  if (!Array.isArray(valor)) return [];
  return valor.filter((item): item is string => typeof item === "string");
}

function lerBool(respostas: RespostasMap, id: string): boolean {
  return respostas[id]?.valor === true;
}

const MODALIDADES = new Set(["Individual", "Grupo", "Domiciliar"]);
const FORMAS = new Set(["Por sessão", "Mensalidade", "Pacote"]);

function lerServicos(respostas: RespostasMap): ServicoInformado[] {
  const valor = respostas.q09_servicos?.valor;
  if (!Array.isArray(valor)) return [];
  return valor
    .filter((linha): linha is Record<string, unknown> => Boolean(linha) && typeof linha === "object")
    .map((linha) => {
      const modalidade = MODALIDADES.has(String(linha.modalidade)) ? (linha.modalidade as ServicoInformado["modalidade"]) : "Individual";
      const forma = FORMAS.has(String(linha.forma_cobranca)) ? (linha.forma_cobranca as ServicoInformado["forma_cobranca"]) : "Por sessão";
      const numero = (chave: string) => {
        const n = Number(linha[chave]);
        return Number.isFinite(n) ? n : null;
      };
      return {
        nome: String(linha.servico ?? "Serviço"),
        modalidade,
        forma_cobranca: forma,
        valor: numero("valor") ?? 0,
        sessoes_por_mes: numero("sessoes_por_mes"),
        sessoes_no_pacote: numero("sessoes_no_pacote"),
        duracao_pacote_meses: numero("duracao_pacote_meses"),
      };
    });
}

function temGrupo(servicos: ServicoInformado[]): boolean {
  return servicos.some((servico) => servico.modalidade === "Grupo");
}

/**
 * Converte as respostas do formulário em premissas numéricas.
 * "Não sei" e campos vazios recebem o parâmetro do escritório e ficam como estimados.
 */
export function resolverPremissas(
  respostas: RespostasMap,
  parametros: ParametrosCalculo,
  contexto?: { aliquotaIss?: number; atividade?: AtividadeTributaria; municipio?: string },
): PremissasDiagnostico {
  const servicos = lerServicos(respostas);
  const dias = lerNumero(respostas, "q10_dias_semana", parametros.dias_semana_padrao);
  const horas = lerNumero(respostas, "q10_horas_dia", parametros.horas_dia_padrao);
  const pacientes = lerNumero(respostas, "q10_pacientes_inicio", 0);
  const sessoes = lerNumero(respostas, "q10_sessoes_por_paciente_mes", 0);
  const pessoasFallback = temGrupo(servicos) ? parametros.pessoas_grupo_padrao : 1;
  const pessoas = temGrupo(servicos)
    ? lerNumero(respostas, "q10_pessoas_por_horario_grupo", pessoasFallback)
    : { valor: 1, origem: "escritorio" as const, naoSabe: false };

  const imovel = lerTexto(respostas, "q06_imovel");
  const aluguel = imovel === "Alugado" ? lerNumero(respostas, "q06_aluguel", 0) : { valor: 0, origem: "cliente" as const, naoSabe: false };

  const naoEstimouGastos = lerBool(respostas, "q08_nao_estimei");
  const gastosBase = lerNumero(respostas, "q08_gastos_mensais_novo_espaco", parametros.gastos_mensais_sugeridos);
  const gastos = naoEstimouGastos
    ? { valor: parametros.gastos_mensais_sugeridos, origem: "estimado" as const, naoSabe: true }
    : gastosBase;

  const outra = lerTexto(respostas, "q11_outra_profissional");
  const temOutra = Boolean(outra && outra !== "Não");
  const forma = lerTexto(respostas, "q11_forma_remuneracao");
  let remuneracao = { valor: 0, origem: "cliente" as OrigemPremissa, naoSabe: false };
  let percentual = { valor: 0, origem: "cliente" as OrigemPremissa, naoSabe: false };
  if (temOutra && forma === "Valor fixo") {
    remuneracao = lerNumero(respostas, "q11_valor_fixo", 0);
  } else if (temOutra && forma === "Percentual") {
    const lido = lerNumero(respostas, "q11_percentual", 0);
    percentual = { ...lido, valor: lido.valor / 100 };
  } else if (temOutra) {
    remuneracao = { valor: 0, origem: "estimado", naoSabe: true };
    percentual = { valor: 0, origem: "estimado", naoSabe: true };
  }

  const semControle = lerBool(respostas, "q03_sem_controle");
  const receitaAtual = semControle ? { valor: 0, origem: "estimado" as const, naoSabe: true } : lerNumero(respostas, "q03_receita_mensal", 0);
  const gastosAtuais = semControle ? { valor: 0, origem: "estimado" as const, naoSabe: true } : lerNumero(respostas, "q03_gastos_mensais", 0);

  const situacaoDivida = lerTexto(respostas, "q05_situacao");
  const parcelas =
    situacaoDivida === "Não existem"
      ? { valor: 0, origem: "cliente" as const, naoSabe: false }
      : situacaoDivida === "Não sei informar"
        ? { valor: 0, origem: "estimado" as const, naoSabe: true }
        : lerNumero(respostas, "q05_parcelas_mensais", 0);
  const atrasados =
    situacaoDivida === "Não existem"
      ? { valor: 0, origem: "cliente" as const, naoSabe: false }
      : lerNumero(respostas, "q05_atrasados_receber", 0);
  const dividas =
    situacaoDivida === "Não existem"
      ? { valor: 0, origem: "cliente" as const, naoSabe: false }
      : lerNumero(respostas, "q05_dividas_total", 0);

  const honorarioInformado = lerNumero(respostas, "q13_honorario_atual", parametros.honorario_contabil_padrao);
  const honorario =
    respostas.q13_honorario_atual && !respostas.q13_honorario_atual.nao_sabe && honorarioInformado.origem === "cliente"
      ? honorarioInformado
      : {
          valor: parametros.honorario_contabil_padrao,
          origem: "estimado" as const,
          naoSabe: Boolean(respostas.q13_honorario_atual?.nao_sabe) || !respostas.q13_honorario_atual,
        };

  const equipamentos = lerNumero(respostas, "q07_equipamentos", 0);
  const reforma = lerNumero(respostas, "q07_reforma", 0);
  const recursos = lerNumero(respostas, "q07_recursos_proprios", 0);
  const financiamento = lerNumero(respostas, "q07_financiamento", 0);
  const retirada = lerNumero(respostas, "q12_retirada_mensal", 0);
  const reserva = lerNumero(respostas, "q12_reserva", 0);

  const despesasValor = aluguel.valor + gastos.valor;
  const aliquota = contexto?.aliquotaIss ?? 0;
  const cidade = lerTexto(respostas, "q01_cidade");

  const premissas: PremissasDiagnostico = {
    dias_semana: campo(dias.valor, dias.origem, dias.naoSabe),
    horas_dia: campo(horas.valor, horas.origem, horas.naoSabe),
    pacientes_inicio: campo(pacientes.valor, pacientes.origem, pacientes.naoSabe),
    sessoes_por_paciente_mes: campo(sessoes.valor, sessoes.origem, sessoes.naoSabe),
    pessoas_por_horario_grupo: campo(pessoas.valor, pessoas.origem, pessoas.naoSabe),
    servicos: {
      valor: servicos,
      origem: servicos.length ? "cliente" : "estimado",
      confirmado: servicos.length > 0,
    },
    aluguel: campo(aluguel.valor, aluguel.origem, aluguel.naoSabe),
    gastos_mensais: campo(gastos.valor, gastos.origem, gastos.naoSabe),
    remuneracao_fixa: campo(remuneracao.valor, remuneracao.origem, remuneracao.naoSabe),
    percentual_remuneracao: campo(percentual.valor, percentual.origem, percentual.naoSabe),
    honorario_contabil: campo(honorario.valor, honorario.origem, honorario.naoSabe),
    parcelas_dividas: campo(parcelas.valor, parcelas.origem, parcelas.naoSabe),
    retirada_mensal: campo(retirada.valor, retirada.origem, retirada.naoSabe),
    equipamentos: campo(equipamentos.valor, equipamentos.origem, equipamentos.naoSabe),
    reforma: campo(reforma.valor, reforma.origem, reforma.naoSabe),
    recursos_proprios: campo(recursos.valor, recursos.origem, recursos.naoSabe),
    financiamento: campo(financiamento.valor, financiamento.origem, financiamento.naoSabe),
    reserva: campo(reserva.valor, reserva.origem, reserva.naoSabe),
    despesas_dedutiveis_mensais: campo(despesasValor, "estimado"),
    pro_labore_mensal: campo(0, "estimado"),
    aliquota_iss: {
      valor: aliquota,
      origem: "escritorio",
      confirmado: false,
      nao_sabe: false,
    },
    atividade: {
      valor: contexto?.atividade ?? "fator_r",
      origem: "estimado",
      confirmado: false,
    },
    municipio_uf: {
      valor: contexto?.municipio || cidade || "",
      origem: cidade ? "cliente" : "estimado",
      confirmado: false,
    },
    regime_adotado: { valor: "menor_carga", origem: "estimado", confirmado: false },
    qualitativo: {
      cnpj: lerTexto(respostas, "q01_cnpj"),
      cidade,
      atendimento: lerTexto(respostas, "q02_atendimento"),
      servicos_atuais: lerTexto(respostas, "q02_servicos_atuais"),
      receita_atual: receitaAtual.origem === "cliente" ? receitaAtual.valor : null,
      gastos_atuais: gastosAtuais.origem === "cliente" ? gastosAtuais.valor : null,
      sem_controle: semControle,
      controles: lerLista(respostas, "q04_controle"),
      separa_pf_pj: lerTexto(respostas, "q04_separa_pf_pj"),
      atrasados: atrasados.naoSabe ? null : atrasados.valor,
      dividas_total: dividas.naoSabe ? null : dividas.valor,
      imovel,
      previsao_abertura: lerTexto(respostas, "q06_previsao_abertura"),
      contrato: lerTexto(respostas, "q06_contrato"),
      aluguel_obs: lerTexto(respostas, "q06_aluguel_obs"),
      outra_profissional: outra,
      forma_remuneracao: forma,
      horas_outra_profissional: temOutra ? lerNumero(respostas, "q11_horas_semana", 0).valor : null,
      contabilidade_atual: lerTexto(respostas, "q13_contabilidade_atual"),
      momentos_recebimento: lerLista(respostas, "q14_momento_recebimento"),
      emissao_notas: lerTexto(respostas, "q14_emissao_notas"),
      servicos_sem_nota: lerTexto(respostas, "q14_servicos_sem_nota"),
      prioridades: lerLista(respostas, "q15_prioridades"),
      tipo_apoio: lerTexto(respostas, "q15_tipo_apoio"),
      preocupacao: lerTexto(respostas, "q16_preocupacao"),
      obs_servicos: lerTexto(respostas, "q09_obs"),
      reserva_obs: lerTexto(respostas, "q12_reserva_obs"),
    },
    percentual_estimadas: 0,
  };
  premissas.percentual_estimadas = percentualEstimadas(premissas);
  return premissas;
}

/** Campos numéricos que entram no alerta de precisão. Parâmetro de escritório não entra. */
export function camposNumericos(premissas: PremissasDiagnostico): CampoNumero[] {
  return [
    premissas.dias_semana,
    premissas.horas_dia,
    premissas.pacientes_inicio,
    premissas.sessoes_por_paciente_mes,
    premissas.pessoas_por_horario_grupo,
    {
      valor: premissas.servicos.valor.length,
      origem: premissas.servicos.origem,
      confirmado: premissas.servicos.confirmado,
      nao_sabe: false,
    },
    premissas.aluguel,
    premissas.gastos_mensais,
    premissas.remuneracao_fixa,
    premissas.percentual_remuneracao,
    premissas.honorario_contabil,
    premissas.parcelas_dividas,
    premissas.retirada_mensal,
    premissas.equipamentos,
    premissas.reforma,
    premissas.recursos_proprios,
    premissas.financiamento,
    premissas.reserva,
    premissas.despesas_dedutiveis_mensais,
    premissas.pro_labore_mensal,
  ];
}

export function percentualEstimadas(premissas: PremissasDiagnostico): number {
  const campos = camposNumericos(premissas).filter((item) => item.origem !== "escritorio");
  if (!campos.length) return 0;
  return campos.filter((item) => item.origem === "estimado").length / campos.length;
}

export function premissasPendentes(premissas: PremissasDiagnostico): string[] {
  const pendentes: string[] = [];
  const nomes: [string, { confirmado: boolean; origem: OrigemPremissa; nao_sabe?: boolean }][] = [
    ["Dias por semana", premissas.dias_semana],
    ["Horas por dia", premissas.horas_dia],
    ["Pacientes no início", premissas.pacientes_inicio],
    ["Sessões por paciente", premissas.sessoes_por_paciente_mes],
    ["Pessoas por horário de grupo", premissas.pessoas_por_horario_grupo],
    ["Serviços e preços", premissas.servicos],
    ["Aluguel", premissas.aluguel],
    ["Gastos mensais", premissas.gastos_mensais],
    ["Remuneração fixa", premissas.remuneracao_fixa],
    ["Percentual da outra profissional", premissas.percentual_remuneracao],
    ["Honorário contábil", premissas.honorario_contabil],
    ["Parcelas", premissas.parcelas_dividas],
    ["Retirada", premissas.retirada_mensal],
    ["Equipamentos", premissas.equipamentos],
    ["Reforma", premissas.reforma],
    ["Recursos próprios", premissas.recursos_proprios],
    ["Financiamento", premissas.financiamento],
    ["Reserva", premissas.reserva],
    ["Despesas dedutíveis", premissas.despesas_dedutiveis_mensais],
    ["Pró-labore", premissas.pro_labore_mensal],
    ["Atividade tributária", premissas.atividade],
    ["Município", premissas.municipio_uf],
    ["ISS", premissas.aliquota_iss],
    ["Regime adotado", premissas.regime_adotado],
  ];
  const decisaoDoContador = new Set(["Atividade tributária", "Município", "ISS", "Regime adotado"]);
  for (const [nome, campoItem] of nomes) {
    const estimadoOuNaoSei = campoItem.origem === "estimado" || ("nao_sabe" in campoItem && Boolean(campoItem.nao_sabe));
    if (!campoItem.confirmado && (estimadoOuNaoSei || decisaoDoContador.has(nome))) pendentes.push(nome);
  }
  return pendentes;
}

export function montarEntrada(premissas: PremissasDiagnostico, parametros: ParametrosCalculo, tributos: Pick<EntradaDiagnostico, "pf" | "simplesIII" | "simplesV" | "presumido">): EntradaDiagnostico {
  return {
    diasSemana: premissas.dias_semana.valor,
    horasDia: premissas.horas_dia.valor,
    semanasPorMes: parametros.semanas_por_mes,
    pessoasGrupo: premissas.pessoas_por_horario_grupo.valor,
    servicos: premissas.servicos.valor,
    pacientesInicio: premissas.pacientes_inicio.valor,
    sessoesPorPaciente: premissas.sessoes_por_paciente_mes.valor,
    aluguel: premissas.aluguel.valor,
    gastosMensais: premissas.gastos_mensais.valor,
    remuneracaoFixa: premissas.remuneracao_fixa.valor,
    percentualRemuneracao: premissas.percentual_remuneracao.valor,
    honorario: premissas.honorario_contabil.valor,
    parcelas: premissas.parcelas_dividas.valor,
    retirada: premissas.retirada_mensal.valor,
    equipamentos: premissas.equipamentos.valor,
    reforma: premissas.reforma.valor,
    recursosProprios: premissas.recursos_proprios.valor,
    financiamento: premissas.financiamento.valor,
    reserva: premissas.reserva.valor,
    despesasDedutiveisMensais: premissas.despesas_dedutiveis_mensais.valor,
    proLaboreMensal: premissas.pro_labore_mensal.valor,
    aliquotaIss: premissas.aliquota_iss.valor,
    atividade: premissas.atividade.valor,
    regimeAdotado: premissas.regime_adotado.valor,
    percentualPremissasEstimadas: percentualEstimadas(premissas),
    parametros,
    pf: tributos.pf,
    simplesIII: tributos.simplesIII,
    simplesV: tributos.simplesV,
    presumido: tributos.presumido,
    qualitativo: premissas.qualitativo,
  };
}
