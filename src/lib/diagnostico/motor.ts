import { gerarAlertas } from "@/lib/diagnostico/alertas";
import { aliquotaEfetivaSimples, compararTributos } from "@/lib/diagnostico/tributos";
import type {
  Cenario,
  EntradaDiagnostico,
  MesProjecao,
  RegimeId,
  ResultadoDiagnostico,
  ServicoInformado,
} from "@/lib/diagnostico/tipos";
import { VERSAO_MOTOR } from "@/lib/rotulos";

const OBSERVACAO_REGIME =
  "A comparação usa os parâmetros vigentes cadastrados pelo escritório. A escolha final do regime depende de validação do contador e pode mudar com a folha, o município e a atividade de fato exercida.";

function pesoServico(servico: ServicoInformado): number {
  if (servico.forma_cobranca === "Por sessão") return 1;
  if (servico.forma_cobranca === "Mensalidade") {
    return servico.sessoes_por_mes && servico.sessoes_por_mes > 0 ? servico.sessoes_por_mes : 0;
  }
  if (servico.forma_cobranca === "Pacote") {
    if (!servico.sessoes_no_pacote || !servico.duracao_pacote_meses || servico.duracao_pacote_meses <= 0) return 0;
    return servico.sessoes_no_pacote / servico.duracao_pacote_meses;
  }
  return 0;
}

function valorPorSessao(servico: ServicoInformado): number {
  if (servico.forma_cobranca === "Por sessão") return servico.valor;
  if (servico.forma_cobranca === "Mensalidade") {
    return servico.sessoes_por_mes && servico.sessoes_por_mes > 0 ? servico.valor / servico.sessoes_por_mes : 0;
  }
  if (servico.forma_cobranca === "Pacote") {
    return servico.sessoes_no_pacote && servico.sessoes_no_pacote > 0 ? servico.valor / servico.sessoes_no_pacote : 0;
  }
  return 0;
}

function vagasServico(servico: ServicoInformado, pessoasGrupo: number): number {
  if (servico.modalidade === "Grupo") return Math.max(pessoasGrupo, 1);
  return 1;
}

/** Ticket e vagas ponderados pelo volume relativo de cada serviço. */
export function mixDeServicos(servicos: ServicoInformado[], pessoasGrupo: number): { ticket: number; vagas: number } {
  const pesos = servicos.map((servico) => pesoServico(servico));
  const soma = pesos.reduce((acc, peso) => acc + peso, 0);
  if (soma <= 0) return { ticket: 0, vagas: 1 };
  const ticket = servicos.reduce((acc, servico, i) => acc + valorPorSessao(servico) * pesos[i], 0) / soma;
  const vagas = servicos.reduce((acc, servico, i) => acc + vagasServico(servico, pessoasGrupo) * pesos[i], 0) / soma;
  return { ticket, vagas };
}

function aliquotaDoRegime(
  entrada: EntradaDiagnostico,
  receitaAnual: number,
  regime: RegimeId,
): number {
  if (regime === "SIMPLES_ANEXO_III") return aliquotaEfetivaSimples(receitaAnual, entrada.simplesIII.faixas);
  if (regime === "SIMPLES_ANEXO_V") return aliquotaEfetivaSimples(receitaAnual, entrada.simplesV.faixas);
  const comparativo = compararTributos({
    receitaAnual,
    despesasDedutiveisAnuais: entrada.despesasDedutiveisMensais * 12,
    folhaAnual: folhaAnualDe(entrada, receitaAnual),
    aliquotaIss: entrada.aliquotaIss,
    atividade: entrada.atividade,
    pf: entrada.pf,
    simplesIII: entrada.simplesIII,
    simplesV: entrada.simplesV,
    presumido: entrada.presumido,
  });
  return comparativo.itens.find((item) => item.regime === regime)?.aliquota_efetiva ?? 0;
}

function folhaAnualDe(entrada: EntradaDiagnostico, receitaAnual: number): number {
  return entrada.proLaboreMensal * 12 + entrada.remuneracaoFixa * 12 + entrada.percentualRemuneracao * receitaAnual;
}

function projetarMeses(opcoes: {
  pacientesInicio: number;
  sessoesPorPaciente: number;
  capacidade: number;
  ocupacaoMax: number;
  crescimento: number;
  mesesRampa: number;
  fatorVolume: number;
  preco: number;
  atendimentosFixos: number | null;
  custosFixos: number;
  retirada: number;
  aliquota: number;
  percentuaisSemImposto: number;
  saldoInicial: number;
  investimento: number;
}): { projecao: MesProjecao[]; payback: number | null } {
  let pacientes = Math.max(opcoes.pacientesInicio, 0);
  const capMax = opcoes.capacidade * opcoes.ocupacaoMax;
  const tetoPacientes = opcoes.sessoesPorPaciente > 0 ? capMax / opcoes.sessoesPorPaciente : capMax;
  let saldo = opcoes.saldoInicial;
  let acumulado = 0;
  let payback: number | null = opcoes.investimento <= 0 ? 0 : null;
  const projecao: MesProjecao[] = [];

  for (let mes = 1; mes <= 12; mes += 1) {
    const pacientesMes = Math.min(pacientes, Math.max(tetoPacientes, 0));
    const atendimentosBase =
      opcoes.atendimentosFixos !== null
        ? opcoes.atendimentosFixos
        : Math.min(pacientesMes * opcoes.sessoesPorPaciente, capMax);
    const atendimentos = Math.max(0, atendimentosBase * opcoes.fatorVolume);
    const receita = atendimentos * opcoes.preco;
    const impostos = receita * opcoes.aliquota;
    const custosVariaveis = receita * opcoes.percentuaisSemImposto;
    const resultado = receita - impostos - custosVariaveis - opcoes.custosFixos - opcoes.retirada;
    saldo += resultado;
    acumulado += resultado;
    if (payback === null && acumulado + 1e-6 >= opcoes.investimento) payback = mes;
    projecao.push({
      mes,
      pacientes: pacientesMes,
      atendimentos,
      receita,
      impostos,
      custos_variaveis: custosVariaveis,
      custos_fixos: opcoes.custosFixos,
      retirada: opcoes.retirada,
      resultado,
      saldo_caixa: saldo,
    });
    // A rampa cresce na virada dos meses 2 até meses_rampa.
    if (opcoes.atendimentosFixos === null && mes < opcoes.mesesRampa) {
      pacientes = pacientesMes * (1 + opcoes.crescimento);
    } else {
      pacientes = pacientesMes;
    }
  }

  return { projecao, payback };
}

function cenarioDe(
  id: Cenario["id"],
  nome: string,
  referencia: { atendimentos: number; preco: number; exige: boolean; mensagem: string | null },
  projecao: MesProjecao[],
  payback: number | null,
  aliquota: number,
): Cenario {
  const primeiro = projecao[0];
  return {
    id,
    nome,
    atendimentos_mes_referencia: referencia.atendimentos,
    preco_por_atendimento: referencia.preco,
    exige_reajuste_preco: referencia.exige,
    mensagem: referencia.mensagem,
    receita_mensal_referencia: primeiro?.receita ?? referencia.atendimentos * referencia.preco,
    aliquota_efetiva: aliquota,
    payback_meses: payback,
    projecao,
  };
}

export function calcularDiagnostico(entrada: EntradaDiagnostico): ResultadoDiagnostico {
  const p = entrada.parametros;
  const mix = mixDeServicos(entrada.servicos, entrada.pessoasGrupo);
  const capacidade = entrada.diasSemana * entrada.horasDia * entrada.semanasPorMes * mix.vagas;
  const ticket = mix.ticket;
  const custosFixos = entrada.aluguel + entrada.gastosMensais + entrada.remuneracaoFixa + entrada.honorario + entrada.parcelas;
  const composicao = [
    { nome: "Aluguel", valor: entrada.aluguel },
    { nome: "Gastos do novo espaço", valor: entrada.gastosMensais },
    { nome: "Remuneração fixa", valor: entrada.remuneracaoFixa },
    { nome: "Honorários contábeis", valor: entrada.honorario },
    { nome: "Parcelas de dívidas", valor: entrada.parcelas },
  ].filter((item) => item.valor > 0);

  const investimento = entrada.equipamentos + entrada.reforma;
  const saldoInicial = entrada.recursosProprios + entrada.financiamento - investimento;
  const necessidade =
    investimento + custosFixos * p.meses_capital_de_giro + entrada.retirada * p.meses_reserva_pessoal;
  const gap = necessidade - entrada.recursosProprios - entrada.financiamento - entrada.reserva;

  const baseProjecao = {
    pacientesInicio: entrada.pacientesInicio,
    sessoesPorPaciente: entrada.sessoesPorPaciente,
    capacidade,
    ocupacaoMax: p.ocupacao_maxima_saudavel,
    crescimento: p.crescimento_mensal_pacientes,
    mesesRampa: p.meses_rampa,
    custosFixos,
    retirada: entrada.retirada,
    percentuaisSemImposto: p.taxa_cartao_media + p.inadimplencia_estimada + entrada.percentualRemuneracao,
    saldoInicial,
    investimento,
  };

  // A receita do cenário realista não depende da alíquota. O imposto é aplicado depois.
  const previaRealista = projetarMeses({
    ...baseProjecao,
    fatorVolume: 1,
    preco: ticket,
    atendimentosFixos: null,
    aliquota: 0,
  });
  const receitaAnualRealista = previaRealista.projecao.reduce((acc, mes) => acc + mes.receita, 0);
  const comparativo = compararTributos({
    receitaAnual: receitaAnualRealista,
    despesasDedutiveisAnuais: entrada.despesasDedutiveisMensais * 12,
    folhaAnual: folhaAnualDe(entrada, receitaAnualRealista),
    aliquotaIss: entrada.aliquotaIss,
    atividade: entrada.atividade,
    pf: entrada.pf,
    simplesIII: entrada.simplesIII,
    simplesV: entrada.simplesV,
    presumido: entrada.presumido,
  });

  const regimeAdotado: RegimeId =
    entrada.regimeAdotado === "menor_carga" ? comparativo.menor.regime : entrada.regimeAdotado;
  const aliquotaRealista = aliquotaDoRegime(entrada, receitaAnualRealista, regimeAdotado);
  const percentuaisSemImposto = baseProjecao.percentuaisSemImposto;
  const percentualCv = aliquotaRealista + percentuaisSemImposto;
  const margem = ticket * (1 - percentualCv);
  const numeradorEquilibrio = custosFixos + entrada.retirada;
  const margemValida = margem > 1e-9;
  const ponto = margemValida ? numeradorEquilibrio / margem : null;
  const ocupacao = ponto !== null && capacidade > 0 ? ponto / capacidade : null;
  const capSaudavel = capacidade * p.ocupacao_maxima_saudavel;
  const precoMinimo =
    margemValida && capSaudavel > 0 ? numeradorEquilibrio / capSaudavel / (1 - percentualCv) : null;

  const realistaProj = projetarMeses({
    ...baseProjecao,
    fatorVolume: 1,
    preco: ticket,
    atendimentosFixos: null,
    aliquota: aliquotaRealista,
  });

  const previaConservador = projetarMeses({
    ...baseProjecao,
    fatorVolume: 1 - p.reducao_cenario_conservador,
    preco: ticket,
    atendimentosFixos: null,
    aliquota: 0,
  });
  const receitaAnualConservador = previaConservador.projecao.reduce((acc, mes) => acc + mes.receita, 0);
  const aliquotaConservador = aliquotaDoRegime(entrada, receitaAnualConservador, regimeAdotado);
  const conservadorProj = projetarMeses({
    ...baseProjecao,
    fatorVolume: 1 - p.reducao_cenario_conservador,
    preco: ticket,
    atendimentosFixos: null,
    aliquota: aliquotaConservador,
  });

  const alvoIdeal = numeradorEquilibrio * (1 + p.margem_seguranca_cenario_ideal);
  let atendimentosIdeal = margemValida ? alvoIdeal / margem : capSaudavel;
  let precoIdeal = ticket;
  let exigeReajuste = false;
  let mensagemIdeal: string | null = null;
  if (!margemValida || capacidade <= 0) {
    exigeReajuste = true;
    atendimentosIdeal = 0;
    precoIdeal = ticket;
    mensagemIdeal = "exige reajuste de preço ou ampliação de agenda";
  } else if (atendimentosIdeal > capSaudavel) {
    exigeReajuste = true;
    atendimentosIdeal = capSaudavel;
    precoIdeal = capSaudavel > 0 ? alvoIdeal / capSaudavel / (1 - percentualCv) : ticket;
    mensagemIdeal = "exige reajuste de preço ou ampliação de agenda";
  }
  const receitaAnualIdeal = atendimentosIdeal * precoIdeal * 12;
  const aliquotaIdeal = aliquotaDoRegime(entrada, receitaAnualIdeal, regimeAdotado);
  const idealProj = projetarMeses({
    ...baseProjecao,
    fatorVolume: 1,
    preco: precoIdeal,
    atendimentosFixos: atendimentosIdeal,
    aliquota: aliquotaIdeal,
  });

  const atendimentosPrevistos = entrada.pacientesInicio * entrada.sessoesPorPaciente;
  const receitaBruta = (realistaProj.projecao[0]?.receita ?? atendimentosPrevistos * ticket);

  const alertas = gerarAlertas({
    separaPfPj: entrada.qualitativo.separa_pf_pj,
    controles: entrada.qualitativo.controles,
    emissaoNotas: entrada.qualitativo.emissao_notas,
    momentosRecebimento: entrada.qualitativo.momentos_recebimento,
    valoresAtraso: entrada.qualitativo.atrasados ?? 0,
    ocupacaoNecessaria: ocupacao,
    gapFinanceiro: gap,
    parcelasMensais: entrada.parcelas,
    receitaProjetada: receitaBruta,
    paybackMeses: realistaProj.payback,
    reserva: entrada.reserva,
    retiradaMensal: entrada.retirada,
    mesesReserva: p.meses_reserva_pessoal,
    percentualPremissasEstimadas: entrada.percentualPremissasEstimadas,
    limitePremissas: p.limite_premissas_estimadas_alerta,
    limiarOcupacaoAlta: p.ocupacao_alerta_alta,
    limiarOcupacaoMedia: p.ocupacao_alerta_media,
    limiarParcelas: p.limite_parcelas_sobre_receita,
    margemNula: !margemValida,
  });

  return {
    versao_motor: VERSAO_MOTOR,
    capacidade_mensal: capacidade,
    vagas_por_horario: mix.vagas,
    ticket_medio: ticket,
    atendimentos_previstos: atendimentosPrevistos,
    receita_bruta_mensal: receitaBruta,
    custos_fixos_mensais: custosFixos,
    composicao_custos: composicao,
    percentual_custos_variaveis: percentualCv,
    aliquota_efetiva_adotada: aliquotaRealista,
    regime_adotado: regimeAdotado,
    margem_contribuicao_por_atendimento: margemValida ? margem : null,
    ponto_equilibrio_atendimentos: ponto,
    ocupacao_necessaria: ocupacao,
    preco_minimo_por_atendimento: precoMinimo,
    necessidade_capital: necessidade,
    gap_financeiro: gap,
    investimento_inicial: investimento,
    saldo_caixa_inicial: saldoInicial,
    payback_meses: realistaProj.payback,
    regime_menor_carga: comparativo.menor.regime,
    comparativo_tributario: comparativo.itens,
    cenarios: {
      conservador: cenarioDe(
        "conservador",
        "Conservador",
        { atendimentos: conservadorProj.projecao[0]?.atendimentos ?? 0, preco: ticket, exige: false, mensagem: null },
        conservadorProj.projecao,
        conservadorProj.payback,
        aliquotaConservador,
      ),
      realista: cenarioDe(
        "realista",
        "Realista",
        { atendimentos: realistaProj.projecao[0]?.atendimentos ?? 0, preco: ticket, exige: false, mensagem: null },
        realistaProj.projecao,
        realistaProj.payback,
        aliquotaRealista,
      ),
      ideal: cenarioDe(
        "ideal",
        "Ideal",
        { atendimentos: atendimentosIdeal, preco: precoIdeal, exige: exigeReajuste, mensagem: mensagemIdeal },
        idealProj.projecao,
        idealProj.payback,
        aliquotaIdeal,
      ),
    },
    percentual_premissas_estimadas: entrada.percentualPremissasEstimadas,
    observacao_regime: OBSERVACAO_REGIME,
    alertas,
  };
}
