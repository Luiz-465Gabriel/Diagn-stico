export type ModalidadeServico = "Individual" | "Grupo" | "Domiciliar";
export type FormaCobranca = "Por sessão" | "Mensalidade" | "Pacote";

export type ServicoInformado = {
  nome: string;
  modalidade: ModalidadeServico;
  forma_cobranca: FormaCobranca;
  valor: number;
  sessoes_por_mes?: number | null;
  sessoes_no_pacote?: number | null;
  duracao_pacote_meses?: number | null;
};

export type RegimeId = "PF_CARNE_LEAO" | "SIMPLES_ANEXO_III" | "SIMPLES_ANEXO_V" | "LUCRO_PRESUMIDO";

export type AtividadeTributaria = "fator_r" | "anexo_iii" | "anexo_v";

export type OrigemPremissa = "cliente" | "estimado" | "escritorio";

export type CampoNumero = {
  valor: number;
  origem: OrigemPremissa;
  confirmado: boolean;
  nao_sabe: boolean;
};

export type FaixaProgressiva = {
  limite: number | null;
  aliquota: number;
  deducao: number;
};

export type ParametroPF = {
  faixas_mensais: FaixaProgressiva[];
  inss_aliquota: number;
  inss_teto: number;
  inss_piso: number;
  deduz_inss_base_ir: boolean;
  inss_minimo_obrigatorio: boolean;
};

export type FaixaSimples = {
  limite_rbt12: number;
  aliquota: number;
  deducao: number;
};

export type ParametroSimples = {
  anexo: "III" | "V";
  faixas: FaixaSimples[];
  fator_r_limite: number;
};

export type ParametroPresumido = {
  percentual_presuncao_irpj: number;
  percentual_presuncao_csll: number;
  aliquota_irpj: number;
  aliquota_adicional_irpj: number;
  limite_adicional_mensal: number;
  aliquota_csll: number;
  aliquota_pis: number;
  aliquota_cofins: number;
  aliquota_cbs: number;
  aliquota_ibs: number;
};

export type ParametrosCalculo = {
  semanas_por_mes: number;
  ocupacao_maxima_saudavel: number;
  taxa_cartao_media: number;
  inadimplencia_estimada: number;
  meses_rampa: number;
  crescimento_mensal_pacientes: number;
  meses_capital_de_giro: number;
  meses_reserva_pessoal: number;
  margem_seguranca_cenario_ideal: number;
  reducao_cenario_conservador: number;
  honorario_contabil_padrao: number;
  limite_premissas_estimadas_alerta: number;
  ocupacao_alerta_alta: number;
  ocupacao_alerta_media: number;
  limite_parcelas_sobre_receita: number;
  gastos_mensais_sugeridos: number;
  dias_semana_padrao: number;
  horas_dia_padrao: number;
  pessoas_grupo_padrao: number;
};

export type Qualitativo = {
  cnpj: string | null;
  cidade: string | null;
  atendimento: string | null;
  servicos_atuais: string | null;
  receita_atual: number | null;
  gastos_atuais: number | null;
  sem_controle: boolean;
  controles: string[];
  separa_pf_pj: string | null;
  atrasados: number | null;
  dividas_total: number | null;
  imovel: string | null;
  previsao_abertura: string | null;
  contrato: string | null;
  aluguel_obs: string | null;
  outra_profissional: string | null;
  forma_remuneracao: string | null;
  horas_outra_profissional: number | null;
  contabilidade_atual: string | null;
  momentos_recebimento: string[];
  emissao_notas: string | null;
  servicos_sem_nota: string | null;
  prioridades: string[];
  tipo_apoio: string | null;
  preocupacao: string | null;
  obs_servicos: string | null;
  reserva_obs: string | null;
};

export type ItemTributo = {
  regime: RegimeId;
  rotulo: string;
  carga_anual: number;
  aliquota_efetiva: number;
  detalhe: string;
};

export type MesProjecao = {
  mes: number;
  pacientes: number;
  atendimentos: number;
  receita: number;
  impostos: number;
  custos_variaveis: number;
  custos_fixos: number;
  retirada: number;
  resultado: number;
  saldo_caixa: number;
};

export type Cenario = {
  id: "conservador" | "realista" | "ideal";
  nome: string;
  atendimentos_mes_referencia: number;
  preco_por_atendimento: number;
  exige_reajuste_preco: boolean;
  mensagem: string | null;
  receita_mensal_referencia: number;
  aliquota_efetiva: number;
  payback_meses: number | null;
  projecao: MesProjecao[];
};

export type Alerta = {
  codigo: string;
  severidade: "alta" | "media" | "baixa";
  titulo: string;
  texto: string;
};

export type ResultadoDiagnostico = {
  versao_motor: string;
  capacidade_mensal: number;
  vagas_por_horario: number;
  ticket_medio: number;
  atendimentos_previstos: number;
  receita_bruta_mensal: number;
  custos_fixos_mensais: number;
  composicao_custos: { nome: string; valor: number }[];
  percentual_custos_variaveis: number;
  aliquota_efetiva_adotada: number;
  regime_adotado: RegimeId;
  margem_contribuicao_por_atendimento: number | null;
  ponto_equilibrio_atendimentos: number | null;
  ocupacao_necessaria: number | null;
  preco_minimo_por_atendimento: number | null;
  necessidade_capital: number;
  gap_financeiro: number;
  investimento_inicial: number;
  saldo_caixa_inicial: number;
  payback_meses: number | null;
  regime_menor_carga: RegimeId;
  comparativo_tributario: ItemTributo[];
  cenarios: {
    conservador: Cenario;
    realista: Cenario;
    ideal: Cenario;
  };
  percentual_premissas_estimadas: number;
  observacao_regime: string;
  alertas: Alerta[];
};

export type EntradaDiagnostico = {
  diasSemana: number;
  horasDia: number;
  semanasPorMes: number;
  pessoasGrupo: number;
  servicos: ServicoInformado[];
  pacientesInicio: number;
  sessoesPorPaciente: number;
  aluguel: number;
  gastosMensais: number;
  remuneracaoFixa: number;
  percentualRemuneracao: number;
  honorario: number;
  parcelas: number;
  retirada: number;
  equipamentos: number;
  reforma: number;
  recursosProprios: number;
  financiamento: number;
  reserva: number;
  despesasDedutiveisMensais: number;
  proLaboreMensal: number;
  aliquotaIss: number;
  atividade: AtividadeTributaria;
  regimeAdotado: RegimeId | "menor_carga";
  percentualPremissasEstimadas: number;
  parametros: ParametrosCalculo;
  pf: ParametroPF;
  simplesIII: ParametroSimples;
  simplesV: ParametroSimples;
  presumido: ParametroPresumido;
  qualitativo: Qualitativo;
};
