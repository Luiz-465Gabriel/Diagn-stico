import type { FormSchema, Pergunta } from "@/lib/formulario/tipos";

const moeda = (parcial: Omit<Pergunta, "tipo" | "permiteNaoSei"> & { obrigatoria?: boolean }): Pergunta => ({
  tipo: "moeda",
  permiteNaoSei: true,
  obrigatoria: parcial.obrigatoria ?? true,
  ...parcial,
});

const numero = (parcial: Omit<Pergunta, "tipo" | "permiteNaoSei">): Pergunta => ({
  tipo: "numero",
  permiteNaoSei: true,
  obrigatoria: true,
  ...parcial,
});

export const PRIORIDADES_APOIO = [
  "Planejar os custos e o dinheiro necessário para abrir",
  "Definir preços e metas de atendimento",
  "Organizar as finanças e minha retirada mensal",
  "Melhorar as cobranças e reduzir atrasos",
  "Avaliar o CNPJ e organizar impostos e notas",
  "Planejar a remuneração e a contratação de outra profissional",
] as const;

export const TIPOS_APOIO = [
  "Orientação inicial para organizar a abertura",
  "Acompanhamento mensal contábil",
  "Acompanhamento mensal contábil e financeiro",
  "Quero entender qual opção faz mais sentido",
] as const;

export const TEMPLATE_PLANEJAMENTO_V1: FormSchema = {
  abertura:
    "Suas respostas vão me ajudar a entender suas necessidades, planejar o apoio para a abertura do seu espaço e preparar uma proposta de serviço adequada para você. Pode usar valores aproximados e responder 'não sei' quando necessário. Leva cerca de 5 a 8 minutos.",
  confirmacao:
    "Recebido! Vou analisar suas respostas e retorno com o diagnóstico e a proposta. Qualquer dúvida, fale comigo pelo WhatsApp.",
  secoes: [
    {
      id: "situacao_atual",
      titulo: "Situação atual",
      perguntas: [
        { id: "q01_cnpj", titulo: "Qual é o seu CNPJ?", tipo: "cpf_cnpj", obrigatoria: false },
        { id: "q01_cidade", titulo: "Cidade e estado do novo espaço", tipo: "texto_curto", obrigatoria: true },
        {
          id: "q02_atendimento",
          titulo: "Você está atendendo atualmente?",
          tipo: "escolha_unica",
          obrigatoria: true,
          opcoes: ["Sim, somente particular", "Sim, particular e convênios", "Sim, somente convênios", "Não estou atendendo"],
        },
        {
          id: "q02_servicos_atuais",
          titulo: "Quais serviços oferece e pretende manter no novo espaço?",
          tipo: "texto_longo",
          obrigatoria: true,
          exibirSe: { perguntaId: "q02_atendimento", operador: "diferente", valor: "Não estou atendendo" },
        },
        moeda({ id: "q03_receita_mensal", titulo: "Quanto você recebe por mês com os atendimentos?" }),
        moeda({ id: "q03_gastos_mensais", titulo: "Quanto gasta por mês para trabalhar?" }),
        { id: "q03_sem_controle", titulo: "Não tenho esse controle", tipo: "checkbox", obrigatoria: false },
        {
          id: "q04_controle",
          titulo: "Como você controla os recebimentos e as despesas?",
          tipo: "multipla_escolha",
          obrigatoria: true,
          opcoes: ["Caderno", "Planilha", "Aplicativo ou sistema", "Extrato bancário", "Não faço controle"],
        },
        {
          id: "q04_separa_pf_pj",
          titulo: "Separa o dinheiro pessoal do dinheiro do trabalho?",
          tipo: "escolha_unica",
          obrigatoria: true,
          opcoes: ["Sim", "Não", "Em parte"],
        },
        moeda({ id: "q05_atrasados_receber", titulo: "Valores a receber em atraso de pacientes" }),
        moeda({ id: "q05_dividas_total", titulo: "Dívidas, impostos ou empréstimos ligados ao trabalho" }),
        moeda({ id: "q05_parcelas_mensais", titulo: "Parcelas mensais dessas dívidas" }),
        {
          id: "q05_situacao",
          titulo: "Sobre esses valores em atraso e dívidas",
          tipo: "escolha_unica",
          obrigatoria: false,
          opcoes: ["Não existem", "Não sei informar"],
        },
      ],
    },
    {
      id: "novo_espaco",
      titulo: "Novo espaço",
      perguntas: [
        { id: "q06_previsao_abertura", titulo: "Previsão de abertura", tipo: "mes_ano", obrigatoria: true, permiteNaoSei: true },
        {
          id: "q06_imovel",
          titulo: "O imóvel do novo espaço será",
          tipo: "escolha_unica",
          obrigatoria: true,
          opcoes: ["Próprio", "Alugado", "Cedido", "Ainda não definido"],
        },
        moeda({
          id: "q06_aluguel",
          titulo: "Aluguel mensal",
          exibirSe: { perguntaId: "q06_imovel", operador: "igual", valor: "Alugado" },
        }),
        { id: "q06_aluguel_obs", titulo: "Observações sobre o aluguel (ex.: reajuste anual)", tipo: "texto_curto", obrigatoria: false },
        {
          id: "q06_contrato",
          titulo: "Já existe contrato para o novo espaço?",
          tipo: "escolha_unica",
          obrigatoria: true,
          opcoes: ["Sim", "Não", "Não se aplica"],
        },
        moeda({ id: "q07_equipamentos", titulo: "Quanto estima gastar com equipamentos?" }),
        moeda({ id: "q07_reforma", titulo: "Reforma e outras despesas de abertura" }),
        moeda({ id: "q07_recursos_proprios", titulo: "Recursos próprios disponíveis para a abertura" }),
        moeda({ id: "q07_financiamento", titulo: "Quanto pretende financiar ou pegar emprestado" }),
        moeda({
          id: "q08_gastos_mensais_novo_espaco",
          titulo: "Quais serão os gastos mensais do novo espaço?",
          ajuda: "Além do aluguel, considere energia, água, internet, limpeza, materiais, sistema e outros gastos. Não inclua sua retirada nem a remuneração de outra profissional.",
        }),
        { id: "q08_nao_estimei", titulo: "Ainda não estimei", tipo: "checkbox", obrigatoria: false },
        {
          id: "q09_servicos",
          titulo: "Quais serviços pretende oferecer e quanto pensa em cobrar?",
          tipo: "tabela_repetivel",
          obrigatoria: true,
          minimoLinhas: 1,
          colunas: [
            { id: "servico", titulo: "Serviço", tipo: "texto_curto", obrigatoria: true },
            { id: "modalidade", titulo: "Modalidade", tipo: "escolha_unica", obrigatoria: true, opcoes: ["Individual", "Grupo", "Domiciliar"] },
            { id: "forma_cobranca", titulo: "Forma de cobrança", tipo: "escolha_unica", obrigatoria: true, opcoes: ["Por sessão", "Mensalidade", "Pacote"] },
            { id: "valor", titulo: "Valor", tipo: "moeda", obrigatoria: true },
            { id: "sessoes_por_mes", titulo: "Sessões por mês", tipo: "numero", obrigatorioSe: { perguntaId: "forma_cobranca", operador: "igual", valor: "Mensalidade" } },
            { id: "sessoes_no_pacote", titulo: "Sessões no pacote", tipo: "numero", obrigatorioSe: { perguntaId: "forma_cobranca", operador: "igual", valor: "Pacote" } },
            { id: "duracao_pacote_meses", titulo: "Duração do pacote (meses)", tipo: "numero", obrigatorioSe: { perguntaId: "forma_cobranca", operador: "igual", valor: "Pacote" } },
          ],
        },
        { id: "q09_obs", titulo: "Observações sobre preços e serviços", tipo: "texto_longo", obrigatoria: false },
        numero({ id: "q10_pacientes_inicio", titulo: "Quantos pacientes você acredita que continuarão com você no início?" }),
        numero({ id: "q10_sessoes_por_paciente_mes", titulo: "Em média, quantas sessões por mês cada paciente faz?" }),
        numero({ id: "q10_dias_semana", titulo: "Dias de atendimento por semana", minimo: 1, maximo: 7 }),
        numero({ id: "q10_horas_dia", titulo: "Horas de atendimento por dia" }),
        numero({
          id: "q10_pessoas_por_horario_grupo",
          titulo: "Nos atendimentos em grupo, quantas pessoas por horário?",
          exibirSe: { perguntaId: "q09_servicos", operador: "contem", valor: "Grupo" },
        }),
      ],
    },
    {
      id: "equipe_reserva",
      titulo: "Equipe e reserva financeira",
      perguntas: [
        {
          id: "q11_outra_profissional",
          titulo: "Pretende contar com outra profissional desde a abertura?",
          tipo: "escolha_unica",
          obrigatoria: true,
          opcoes: ["Sim", "Não", "Ainda estou avaliando"],
        },
        numero({
          id: "q11_horas_semana",
          titulo: "Quantas horas por semana?",
          exibirSe: { perguntaId: "q11_outra_profissional", operador: "diferente", valor: "Não" },
        }),
        {
          id: "q11_forma_remuneracao",
          titulo: "Como será a remuneração dessa profissional?",
          tipo: "escolha_unica",
          obrigatoria: true,
          opcoes: ["Valor fixo", "Percentual", "Ainda não defini"],
          exibirSe: { perguntaId: "q11_outra_profissional", operador: "diferente", valor: "Não" },
        },
        moeda({
          id: "q11_valor_fixo",
          titulo: "Qual o valor fixo mensal?",
          exibirSe: { perguntaId: "q11_forma_remuneracao", operador: "igual", valor: "Valor fixo" },
        }),
        {
          id: "q11_percentual",
          titulo: "Qual o percentual sobre os atendimentos?",
          tipo: "percentual",
          permiteNaoSei: true,
          obrigatoria: true,
          exibirSe: { perguntaId: "q11_forma_remuneracao", operador: "igual", valor: "Percentual" },
        },
        { id: "q11_obs", titulo: "Observações sobre a outra profissional", tipo: "texto_longo", obrigatoria: false },
        moeda({ id: "q12_retirada_mensal", titulo: "Quanto você precisa retirar por mês para suas despesas pessoais?" }),
        moeda({ id: "q12_reserva", titulo: "Existe reserva além do dinheiro destinado à abertura? Qual valor?" }),
        { id: "q12_reserva_obs", titulo: "Observações sobre a reserva", tipo: "texto_curto", obrigatoria: false },
      ],
    },
    {
      id: "contabilidade",
      titulo: "Contabilidade e acompanhamento",
      perguntas: [
        {
          id: "q13_contabilidade_atual",
          titulo: "O que sua contabilidade faz atualmente?",
          ajuda: "Informe também se existem impostos, declarações ou outras pendências que você saiba.",
          tipo: "texto_longo",
          obrigatoria: false,
        },
        moeda({ id: "q13_honorario_atual", titulo: "Quanto você paga por mês hoje?", obrigatoria: false }),
        {
          id: "q14_momento_recebimento",
          titulo: "Quando você recebe?",
          tipo: "multipla_escolha",
          obrigatoria: true,
          opcoes: ["Antes do atendimento", "No dia", "Depois do atendimento"],
        },
        {
          id: "q14_emissao_notas",
          titulo: "Emite notas?",
          tipo: "escolha_unica",
          obrigatoria: true,
          opcoes: ["Em todos os atendimentos", "Em alguns", "Não emito"],
        },
        {
          id: "q14_servicos_sem_nota",
          titulo: "Quais serviços ficam sem nota?",
          tipo: "texto_longo",
          obrigatoria: true,
          exibirSe: { perguntaId: "q14_emissao_notas", operador: "diferente", valor: "Em todos os atendimentos" },
        },
        {
          id: "q15_prioridades",
          titulo: "Quais são suas três prioridades para o meu apoio?",
          tipo: "multipla_escolha",
          obrigatoria: true,
          minimo: 1,
          maximo: 3,
          opcoes: [...PRIORIDADES_APOIO],
        },
        {
          id: "q15_tipo_apoio",
          titulo: "Você procura:",
          tipo: "escolha_unica",
          obrigatoria: true,
          opcoes: [...TIPOS_APOIO],
        },
        {
          id: "q16_preocupacao",
          titulo: "Há alguma preocupação importante que não apareceu nas perguntas?",
          tipo: "texto_longo",
          obrigatoria: false,
        },
      ],
    },
  ],
};

export const NOME_TEMPLATE = "Planejamento do Seu Novo Espaço";
export const VERSAO_TEMPLATE = 1;
