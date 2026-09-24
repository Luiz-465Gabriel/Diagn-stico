import { describe, expect, it } from "vitest";
import { gerarAlertas } from "@/lib/diagnostico/alertas";
import { calcularDiagnostico } from "@/lib/diagnostico/motor";
import { montarEntrada, resolverPremissas } from "@/lib/diagnostico/premissas";
import type { EntradaDiagnostico, ParametrosCalculo, Qualitativo } from "@/lib/diagnostico/tipos";
import { aliquotaEfetivaSimples, cargaLucroPresumido, cargaPessoaFisica, resolverAnexoSimples } from "@/lib/diagnostico/tributos";
import type { RespostasMap } from "@/lib/formulario/tipos";

const parametros: ParametrosCalculo = {
  semanas_por_mes: 4,
  ocupacao_maxima_saudavel: 0.85,
  taxa_cartao_media: 0.05,
  inadimplencia_estimada: 0.05,
  meses_rampa: 1,
  crescimento_mensal_pacientes: 0,
  meses_capital_de_giro: 2,
  meses_reserva_pessoal: 3,
  margem_seguranca_cenario_ideal: 0.2,
  reducao_cenario_conservador: 0.2,
  honorario_contabil_padrao: 400,
  limite_premissas_estimadas_alerta: 0.3,
  ocupacao_alerta_alta: 0.7,
  ocupacao_alerta_media: 0.5,
  limite_parcelas_sobre_receita: 0.15,
  gastos_mensais_sugeridos: 0,
  dias_semana_padrao: 5,
  horas_dia_padrao: 6,
  pessoas_grupo_padrao: 1,
};

const tributos = {
  pf: {
    faixas_mensais: [{ limite: null, aliquota: 0.275, deducao: 0 }],
    inss_aliquota: 0.2,
    inss_teto: 10000,
    inss_piso: 1518,
    deduz_inss_base_ir: false,
    inss_minimo_obrigatorio: true,
  },
  simplesIII: {
    anexo: "III" as const,
    faixas: [{ limite_rbt12: 180000, aliquota: 0.15, deducao: 0 }],
    fator_r_limite: 0.28,
  },
  simplesV: {
    anexo: "V" as const,
    faixas: [{ limite_rbt12: 180000, aliquota: 0.3, deducao: 0 }],
    fator_r_limite: 0.28,
  },
  presumido: {
    percentual_presuncao_irpj: 0.32,
    percentual_presuncao_csll: 0.32,
    aliquota_irpj: 0.25,
    aliquota_adicional_irpj: 0.1,
    limite_adicional_mensal: 20000,
    aliquota_csll: 0.12,
    aliquota_pis: 0.02,
    aliquota_cofins: 0.08,
    aliquota_cbs: 0,
    aliquota_ibs: 0,
  },
};

function respostasCaso(): RespostasMap {
  return {
    q01_cidade: { valor: "Campinas/SP" },
    q04_controle: { valor: ["Planilha"] },
    q04_separa_pf_pj: { valor: "Sim" },
    q05_atrasados_receber: { valor: 0 },
    q05_parcelas_mensais: { valor: 100 },
    q06_imovel: { valor: "Alugado" },
    q06_aluguel: { valor: 1000 },
    q07_equipamentos: { valor: 10000 },
    q07_reforma: { valor: 5000 },
    q07_recursos_proprios: { valor: 8000 },
    q07_financiamento: { valor: 7000 },
    q08_gastos_mensais_novo_espaco: { valor: 500 },
    q09_servicos: {
      valor: [
        { servico: "Consulta", modalidade: "Individual", forma_cobranca: "Por sessão", valor: 200 },
        { servico: "Grupo", modalidade: "Grupo", forma_cobranca: "Mensalidade", valor: 400, sessoes_por_mes: 4 },
        {
          servico: "Pacote domiciliar",
          modalidade: "Domiciliar",
          forma_cobranca: "Pacote",
          valor: 1200,
          sessoes_no_pacote: 8,
          duracao_pacote_meses: 2,
        },
      ],
    },
    q10_pacientes_inicio: { valor: 10 },
    q10_sessoes_por_paciente_mes: { valor: 2 },
    q10_dias_semana: { valor: 5 },
    q10_horas_dia: { valor: 4 },
    q10_pessoas_por_horario_grupo: { valor: 4 },
    q11_outra_profissional: { valor: "Não" },
    q12_retirada_mensal: { valor: 2000 },
    q12_reserva: { valor: 3000 },
    q13_honorario_atual: { valor: null, nao_sabe: true },
    q14_momento_recebimento: { valor: ["No dia"] },
    q14_emissao_notas: { valor: "Em todos os atendimentos" },
  };
}

describe("motor de diagnóstico", () => {
  it("caso fixo com mensalidade, pacote, grupo e Não sei preenchido por premissa", () => {
    const premissas = resolverPremissas(respostasCaso(), parametros, {
      aliquotaIss: 0.05,
      atividade: "anexo_iii",
    });

    // O cliente marcou Não sei no honorário. A premissa usa R$ 400 do parâmetro.
    expect(premissas.honorario_contabil).toMatchObject({ valor: 400, origem: "estimado", nao_sabe: true });
    // 3 estimadas (honorário, despesas dedutíveis e pró-labore) em 20 campos numéricos.
    expect(premissas.percentual_estimadas).toBeCloseTo(3 / 20, 6);

    const resultado = calcularDiagnostico(montarEntrada(premissas, parametros, tributos));

    // Vagas: (1×1 + 4×4 + 1×4) / 9 = 7/3. Capacidade: 5 × 4 × 4 × 7/3 = 560/3.
    expect(resultado.vagas_por_horario).toBeCloseTo(7 / 3, 6);
    expect(resultado.capacidade_mensal).toBeCloseTo(560 / 3, 6);
    // Ticket: (200×1 + 100×4 + 150×4) / 9 = 400/3.
    expect(resultado.ticket_medio).toBeCloseTo(400 / 3, 6);
    expect(resultado.atendimentos_previstos).toBe(20);
    expect(resultado.receita_bruta_mensal).toBeCloseTo(8000 / 3, 6);
    expect(resultado.custos_fixos_mensais).toBe(2000);
    expect(resultado.percentual_custos_variaveis).toBeCloseTo(0.25, 6);
    expect(resultado.margem_contribuicao_por_atendimento).toBeCloseTo(100, 6);
    expect(resultado.ponto_equilibrio_atendimentos).toBeCloseTo(40, 6);
    expect(resultado.ocupacao_necessaria).toBeCloseTo(40 / (560 / 3), 6);
    expect(resultado.preco_minimo_por_atendimento).toBeCloseTo(4000 / ((560 / 3) * 0.85) / 0.75, 6);
    expect(resultado.necessidade_capital).toBe(25000);
    expect(resultado.gap_financeiro).toBe(7000);
    expect(resultado.regime_menor_carga).toBe("SIMPLES_ANEXO_III");
    expect(resultado.aliquota_efetiva_adotada).toBeCloseTo(0.15, 6);
    expect(resultado.comparativo_tributario.find((item) => item.regime === "SIMPLES_ANEXO_III")?.carga_anual).toBeCloseTo(4800, 4);
    expect(resultado.comparativo_tributario.find((item) => item.regime === "PF_CARNE_LEAO")?.carga_anual).toBeCloseTo(7493.2, 4);
    expect(resultado.comparativo_tributario.find((item) => item.regime === "LUCRO_PRESUMIDO")?.carga_anual).toBeCloseTo(8588.8, 4);

    expect(resultado.cenarios.realista.projecao[0]?.resultado).toBeCloseTo(-2000, 4);
    expect(resultado.cenarios.realista.payback_meses).toBeNull();
    expect(resultado.cenarios.conservador.projecao[0]?.atendimentos).toBeCloseTo(16, 6);
    expect(resultado.cenarios.ideal.exige_reajuste_preco).toBe(false);
    expect(resultado.cenarios.ideal.atendimentos_mes_referencia).toBeCloseTo(48, 6);
    expect(resultado.cenarios.ideal.projecao[0]?.resultado).toBeCloseTo(800, 4);
    expect(resultado.alertas.map((alerta) => alerta.codigo)).toEqual(["gap_financeiro", "payback", "reserva_curta"]);
    expect(resultado.alertas[0]?.texto).toMatch(/7\.000,00/);
  });

  it("cresce a carteira até o mês da rampa e depois segura", () => {
    const qualitativo: Qualitativo = {
      cnpj: null,
      cidade: null,
      atendimento: null,
      servicos_atuais: null,
      receita_atual: null,
      gastos_atuais: null,
      sem_controle: false,
      controles: ["Planilha"],
      separa_pf_pj: "Sim",
      atrasados: 0,
      dividas_total: 0,
      imovel: null,
      previsao_abertura: null,
      contrato: null,
      aluguel_obs: null,
      outra_profissional: "Não",
      forma_remuneracao: null,
      horas_outra_profissional: null,
      contabilidade_atual: null,
      momentos_recebimento: ["No dia"],
      emissao_notas: "Em todos os atendimentos",
      servicos_sem_nota: null,
      prioridades: [],
      tipo_apoio: null,
      preocupacao: null,
      obs_servicos: null,
      reserva_obs: null,
    };
    const entrada: EntradaDiagnostico = {
      diasSemana: 5,
      horasDia: 8,
      semanasPorMes: 4,
      pessoasGrupo: 1,
      servicos: [{ nome: "Sessão", modalidade: "Individual", forma_cobranca: "Por sessão", valor: 100 }],
      pacientesInicio: 10,
      sessoesPorPaciente: 1,
      aluguel: 0,
      gastosMensais: 0,
      remuneracaoFixa: 0,
      percentualRemuneracao: 0,
      honorario: 0,
      parcelas: 0,
      retirada: 0,
      equipamentos: 0,
      reforma: 0,
      recursosProprios: 0,
      financiamento: 0,
      reserva: 0,
      despesasDedutiveisMensais: 0,
      proLaboreMensal: 0,
      aliquotaIss: 0,
      atividade: "anexo_iii",
      regimeAdotado: "SIMPLES_ANEXO_III",
      percentualPremissasEstimadas: 0,
      parametros: { ...parametros, meses_rampa: 4, crescimento_mensal_pacientes: 0.1, ocupacao_maxima_saudavel: 1 },
      ...tributos,
      qualitativo,
    };
    const resultado = calcularDiagnostico(entrada);
    const pacientes = resultado.cenarios.realista.projecao.slice(0, 5).map((mes) => mes.pacientes);
    expect(pacientes[0]).toBeCloseTo(10, 6);
    expect(pacientes[1]).toBeCloseTo(11, 6);
    expect(pacientes[2]).toBeCloseTo(12.1, 6);
    expect(pacientes[3]).toBeCloseTo(13.31, 6);
    expect(pacientes[4]).toBeCloseTo(13.31, 6);
  });
});

describe("tributos", () => {
  it("calcula o simples com parcela a deduzir", () => {
    const aliquota = aliquotaEfetivaSimples(200000, [
      { limite_rbt12: 180000, aliquota: 0.06, deducao: 0 },
      { limite_rbt12: 360000, aliquota: 0.112, deducao: 9360 },
    ]);
    expect(aliquota).toBeCloseTo(0.0652, 6);
  });

  it("aplica o fator R para escolher o anexo", () => {
    const acima = resolverAnexoSimples({
      atividade: "fator_r",
      receitaAnual: 100000,
      folhaAnual: 40000,
      simplesIII: tributos.simplesIII,
      simplesV: tributos.simplesV,
    });
    const abaixo = resolverAnexoSimples({
      atividade: "fator_r",
      receitaAnual: 100000,
      folhaAnual: 10000,
      simplesIII: tributos.simplesIII,
      simplesV: tributos.simplesV,
    });
    expect(acima.anexo).toBe("III");
    expect(abaixo.anexo).toBe("V");
  });

  it("calcula carnê-leão e lucro presumido com os parâmetros recebidos", () => {
    const pf = cargaPessoaFisica({
      receitaAnual: 120000,
      despesasDedutiveisAnuais: 24000,
      pf: {
        faixas_mensais: [
          { limite: 2000, aliquota: 0, deducao: 0 },
          { limite: 4000, aliquota: 0.1, deducao: 200 },
          { limite: null, aliquota: 0.2, deducao: 600 },
        ],
        inss_aliquota: 0.2,
        inss_teto: 8000,
        inss_piso: 1000,
        deduz_inss_base_ir: true,
        inss_minimo_obrigatorio: true,
      },
    });
    expect(pf.carga_anual).toBeCloseTo(27360, 4);

    const presumido = cargaLucroPresumido({
      receitaAnual: 120000,
      aliquotaIss: 0.05,
      presumido: {
        percentual_presuncao_irpj: 0.32,
        percentual_presuncao_csll: 0.32,
        aliquota_irpj: 0.15,
        aliquota_adicional_irpj: 0.1,
        limite_adicional_mensal: 20000,
        aliquota_csll: 0.09,
        aliquota_pis: 0.0065,
        aliquota_cofins: 0.03,
        aliquota_cbs: 0,
        aliquota_ibs: 0,
      },
    });
    expect(presumido.carga_anual).toBeCloseTo(19596, 4);
  });
});

describe("alertas", () => {
  const base = {
    separaPfPj: "Sim",
    controles: ["Planilha"],
    emissaoNotas: "Em todos os atendimentos",
    momentosRecebimento: ["No dia"],
    valoresAtraso: 0,
    ocupacaoNecessaria: 0.3,
    gapFinanceiro: 0,
    parcelasMensais: 0,
    receitaProjetada: 10000,
    paybackMeses: 6,
    reserva: 9000,
    retiradaMensal: 2000,
    mesesReserva: 3,
    percentualPremissasEstimadas: 0.1,
    limitePremissas: 0.3,
    limiarOcupacaoAlta: 0.7,
    limiarOcupacaoMedia: 0.5,
    limiarParcelas: 0.15,
    margemNula: false,
  };

  it("classifica ocupação, notas, separação e premissas", () => {
    const alertas = gerarAlertas({
      ...base,
      separaPfPj: "Não",
      controles: ["Caderno"],
      emissaoNotas: "Não emito",
      momentosRecebimento: ["Depois do atendimento"],
      valoresAtraso: 500,
      ocupacaoNecessaria: 0.8,
      percentualPremissasEstimadas: 0.4,
    });
    expect(alertas.map((alerta) => alerta.codigo)).toEqual([
      "separa_dinheiro",
      "nota_fiscal",
      "ocupacao_alta",
      "controle_fraco",
      "atraso_recebimento",
      "premissas_estimadas",
    ]);
  });

  it("trata ocupação intermediária como média", () => {
    const alertas = gerarAlertas({ ...base, ocupacaoNecessaria: 0.7 });
    expect(alertas.map((alerta) => alerta.codigo)).toEqual(["ocupacao_media"]);
  });
});
