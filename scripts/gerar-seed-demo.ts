import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { validarCpf } from "@/lib/cpf-cnpj";
import { calcularDiagnostico } from "@/lib/diagnostico/motor";
import { parametrosDeLinhas, tributosVigentes, type LinhaTributo } from "@/lib/diagnostico/parametros";
import { montarEntrada, resolverPremissas, type PremissasDiagnostico } from "@/lib/diagnostico/premissas";
import { NOME_TEMPLATE, TEMPLATE_PLANEJAMENTO_V1, VERSAO_TEMPLATE } from "@/lib/formulario/template-v1";
import type { RespostasMap } from "@/lib/formulario/tipos";
import { totalizarItens } from "@/lib/proposta/totais";
import { CONDICOES_PAGAMENTO_PADRAO, ESCOPO_INCLUSO_PADRAO, ESCOPO_NAO_INCLUSO_PADRAO, VERSAO_MOTOR } from "@/lib/rotulos";

const TOKEN_FORMULARIO = "empmed-demo-formulario-helena-vasconcelos-v1";
const TOKEN_PROPOSTA = "empmed-demo-proposta-helena-vasconcelos-v1";

const ID = {
  template: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  cliente: "11111111-1111-4111-8111-111111111111",
  envio: "22222222-2222-4222-8222-222222222222",
  respostas: "33333333-3333-4333-8333-333333333333",
  diagnostico: "44444444-4444-4444-8444-444444444444",
  proposta: "55555555-5555-4555-8555-555555555555",
};

function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sqlJson(valor: unknown) {
  return `$empmed$${JSON.stringify(valor)}$empmed$::jsonb`;
}

function sqlTexto(valor: string) {
  return `$$${valor}$$`;
}

const linhasParametros = [
  ["semanas_por_mes", 4.33],
  ["ocupacao_maxima_saudavel", 0.85],
  ["taxa_cartao_media", 0.03],
  ["inadimplencia_estimada", 0.03],
  ["meses_rampa", 4],
  ["crescimento_mensal_pacientes", 0.1],
  ["meses_capital_de_giro", 3],
  ["meses_reserva_pessoal", 3],
  ["margem_seguranca_cenario_ideal", 0.2],
  ["reducao_cenario_conservador", 0.2],
  ["honorario_contabil_padrao", 800],
  ["limite_premissas_estimadas_alerta", 0.3],
  ["ocupacao_alerta_alta", 0.7],
  ["ocupacao_alerta_media", 0.5],
  ["limite_parcelas_sobre_receita", 0.15],
  ["gastos_mensais_sugeridos", 0],
  ["dias_semana_padrao", 5],
  ["horas_dia_padrao", 6],
  ["pessoas_grupo_padrao", 1],
].map(([chave, valor]) => ({ chave: String(chave), valor: Number(valor) }));

const fonte = "EXEMPLO — VALIDAR";
const tributos: LinhaTributo[] = [
  {
    id: "pf",
    regime: "PF_CARNE_LEAO",
    vigencia_inicio: "2026-01-01",
    vigencia_fim: null,
    fonte_legal: fonte,
    parametros: {
      faixas_mensais: [
        { limite: 2428.8, aliquota: 0, deducao: 0 },
        { limite: 2826.65, aliquota: 0.075, deducao: 182.16 },
        { limite: 3751.05, aliquota: 0.15, deducao: 394.16 },
        { limite: 4664.68, aliquota: 0.225, deducao: 675.49 },
        { limite: null, aliquota: 0.275, deducao: 908.73 },
      ],
      inss_aliquota: 0.2,
      inss_teto: 8157.41,
      inss_piso: 1518,
      deduz_inss_base_ir: true,
      inss_minimo_obrigatorio: true,
    },
  },
  {
    id: "iii",
    regime: "SIMPLES_ANEXO_III",
    vigencia_inicio: "2026-01-01",
    vigencia_fim: null,
    fonte_legal: fonte,
    parametros: {
      anexo: "III",
      fator_r_limite: 0.28,
      faixas: [
        { limite_rbt12: 180000, aliquota: 0.06, deducao: 0 },
        { limite_rbt12: 360000, aliquota: 0.112, deducao: 9360 },
        { limite_rbt12: 720000, aliquota: 0.135, deducao: 17640 },
        { limite_rbt12: 1800000, aliquota: 0.16, deducao: 35640 },
        { limite_rbt12: 3600000, aliquota: 0.21, deducao: 125640 },
        { limite_rbt12: 4800000, aliquota: 0.33, deducao: 648000 },
      ],
    },
  },
  {
    id: "v",
    regime: "SIMPLES_ANEXO_V",
    vigencia_inicio: "2026-01-01",
    vigencia_fim: null,
    fonte_legal: fonte,
    parametros: {
      anexo: "V",
      fator_r_limite: 0.28,
      faixas: [
        { limite_rbt12: 180000, aliquota: 0.155, deducao: 0 },
        { limite_rbt12: 360000, aliquota: 0.18, deducao: 4500 },
        { limite_rbt12: 720000, aliquota: 0.195, deducao: 9900 },
        { limite_rbt12: 1800000, aliquota: 0.205, deducao: 17100 },
        { limite_rbt12: 3600000, aliquota: 0.23, deducao: 62100 },
        { limite_rbt12: 4800000, aliquota: 0.305, deducao: 540000 },
      ],
    },
  },
  {
    id: "lp",
    regime: "LUCRO_PRESUMIDO",
    vigencia_inicio: "2026-01-01",
    vigencia_fim: null,
    fonte_legal: fonte,
    parametros: {
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
  },
];

const cpf = "52998224725";
if (!validarCpf(cpf)) throw new Error("CPF de demonstração inválido.");

const respostas: RespostasMap = {
  q01_cidade: { valor: "Mogi Guaçu/SP" },
  q02_atendimento: { valor: "Sim, somente particular" },
  q02_servicos_atuais: { valor: "Fisioterapia ortopédica e pilates clínico, em consultório alugado." },
  q03_receita_mensal: { valor: 8500 },
  q03_gastos_mensais: { valor: 3200 },
  q04_controle: { valor: ["Caderno"] },
  q04_separa_pf_pj: { valor: "Não" },
  q05_atrasados_receber: { valor: 1800 },
  q05_dividas_total: { valor: 12000 },
  q05_parcelas_mensais: { valor: 650 },
  q06_previsao_abertura: { valor: "2026-11" },
  q06_imovel: { valor: "Alugado" },
  q06_aluguel: { valor: 2800 },
  q06_aluguel_obs: { valor: "Reajuste anual pelo IGPM." },
  q06_contrato: { valor: "Sim" },
  q07_equipamentos: { valor: 42000 },
  q07_reforma: { valor: 15000 },
  q07_recursos_proprios: { valor: 25000 },
  q07_financiamento: { valor: 20000 },
  q08_gastos_mensais_novo_espaco: { valor: 2100 },
  q09_servicos: {
    valor: [
      { servico: "Fisioterapia", modalidade: "Individual", forma_cobranca: "Por sessão", valor: 180 },
      { servico: "Pilates clínico", modalidade: "Grupo", forma_cobranca: "Mensalidade", valor: 320, sessoes_por_mes: 8 },
      { servico: "Atendimento domiciliar", modalidade: "Domiciliar", forma_cobranca: "Pacote", valor: 1600, sessoes_no_pacote: 8, duracao_pacote_meses: 2 },
    ],
  },
  q10_pacientes_inicio: { valor: 18 },
  q10_sessoes_por_paciente_mes: { valor: 4 },
  q10_dias_semana: { valor: 5 },
  q10_horas_dia: { valor: 6 },
  q10_pessoas_por_horario_grupo: { valor: 4 },
  q11_outra_profissional: { valor: "Ainda estou avaliando" },
  q11_horas_semana: { valor: 10 },
  q11_forma_remuneracao: { valor: "Percentual" },
  q11_percentual: { valor: 30 },
  q12_retirada_mensal: { valor: 7000 },
  q12_reserva: { valor: 8000 },
  q12_reserva_obs: { valor: "Reserva na poupança, fora do valor da reforma." },
  q13_contabilidade_atual: { valor: "Não tenho contador. Faço o carnê-leão quando lembro." },
  q13_honorario_atual: { valor: null, nao_sabe: true },
  q14_momento_recebimento: { valor: ["Depois do atendimento"] },
  q14_emissao_notas: { valor: "Em alguns" },
  q14_servicos_sem_nota: { valor: "As mensalidades de pilates em grupo ficam sem nota." },
  q15_prioridades: {
    valor: [
      "Planejar os custos e o dinheiro necessário para abrir",
      "Definir preços e metas de atendimento",
      "Organizar as finanças e minha retirada mensal",
    ],
  },
  q15_tipo_apoio: { valor: "Acompanhamento mensal contábil e financeiro" },
  q16_preocupacao: { valor: "Tenho medo de abrir e não conseguir pagar o aluguel nos primeiros meses." },
};

const parametros = parametrosDeLinhas(linhasParametros);
const vigentes = tributosVigentes(tributos, "2026-09-24");
const premissas = resolverPremissas(respostas, parametros, {
  aliquotaIss: 0.02,
  atividade: "fator_r",
  municipio: "Mogi Guaçu/SP",
});

function confirmar(premissasAtuais: PremissasDiagnostico) {
  const campos = [
    premissasAtuais.dias_semana,
    premissasAtuais.horas_dia,
    premissasAtuais.pacientes_inicio,
    premissasAtuais.sessoes_por_paciente_mes,
    premissasAtuais.pessoas_por_horario_grupo,
    premissasAtuais.aluguel,
    premissasAtuais.gastos_mensais,
    premissasAtuais.remuneracao_fixa,
    premissasAtuais.percentual_remuneracao,
    premissasAtuais.honorario_contabil,
    premissasAtuais.parcelas_dividas,
    premissasAtuais.retirada_mensal,
    premissasAtuais.equipamentos,
    premissasAtuais.reforma,
    premissasAtuais.recursos_proprios,
    premissasAtuais.financiamento,
    premissasAtuais.reserva,
    premissasAtuais.despesas_dedutiveis_mensais,
    premissasAtuais.pro_labore_mensal,
    premissasAtuais.aliquota_iss,
    premissasAtuais.atividade,
    premissasAtuais.municipio_uf,
    premissasAtuais.regime_adotado,
    premissasAtuais.servicos,
  ];
  for (const campo of campos) campo.confirmado = true;
}

confirmar(premissas);
const resultado = calcularDiagnostico(montarEntrada(premissas, parametros, vigentes));
const resultados = { ...resultado, fontes_legais: vigentes.fontes };

const itens = totalizarItens([
  {
    servico_id: "a1000000-0000-4000-8000-000000000001",
    descricao: "Planejamento de abertura",
    quantidade: 1,
    valor_unitario: 1800,
    desconto: 0,
    tipo: "avulso",
    prioridade_origem: "Planejar os custos e o dinheiro necessário para abrir",
  },
  {
    servico_id: "a1000000-0000-4000-8000-000000000002",
    descricao: "Precificação e metas",
    quantidade: 1,
    valor_unitario: 1400,
    desconto: 0,
    tipo: "avulso",
    prioridade_origem: "Definir preços e metas de atendimento",
  },
  {
    servico_id: "a1000000-0000-4000-8000-000000000003",
    descricao: "Organização financeira",
    quantidade: 1,
    valor_unitario: 1200,
    desconto: 0,
    tipo: "avulso",
    prioridade_origem: "Organizar as finanças e minha retirada mensal",
  },
  {
    servico_id: "a1000000-0000-4000-8000-000000000009",
    descricao: "Contabilidade e acompanhamento financeiro",
    quantidade: 1,
    valor_unitario: 1400,
    desconto: 0,
    tipo: "mensal",
    prioridade_origem: "Acompanhamento mensal contábil e financeiro",
  },
]);

const templateSql = `-- Template público v1. O schema é o mesmo de src/lib/formulario/template-v1.ts.
insert into public.form_templates (id, nome, descricao, versao, schema, ativo)
values (
  '${ID.template}',
  '${NOME_TEMPLATE}',
  'Formulário enviado ao cliente antes do diagnóstico e da proposta.',
  ${VERSAO_TEMPLATE},
  ${sqlJson(TEMPLATE_PLANEJAMENTO_V1)},
  true
)
on conflict (nome, versao) do update set schema = excluded.schema, descricao = excluded.descricao, ativo = true;
`;

const itensSql = itens.itens
  .map((item, indice) => {
    const id = `66666666-6666-4666-8666-66666666666${indice + 1}`;
    return `  ('${id}', '${ID.proposta}', '${item.servico_id}', ${sqlTexto(item.descricao)}, ${item.quantidade}, ${item.valor_unitario}, ${item.desconto}, ${item.valor_total}, '${item.tipo}', ${indice + 1}, ${sqlTexto(item.prioridade_origem || "")})`;
  })
  .join(",\n");

const demoSql = `-- Demonstração: Helena Vasconcelos, fisioterapeuta, com formulário respondido,
-- diagnóstico revisado pelo motor ${VERSAO_MOTOR} e proposta enviada.
-- Tokens (somente o hash fica no banco):
--   formulário ${TOKEN_FORMULARIO}
--   proposta   ${TOKEN_PROPOSTA}

insert into public.clientes (
  id, tipo, nome, cpf_cnpj, email, whatsapp, profissao_especialidade, cidade_uf, origem_lead, status_funil, observacoes
) values (
  '${ID.cliente}',
  'PF',
  'Helena Vasconcelos',
  '${cpf}',
  'helena.vasconcelos.demo@example.com',
  '19998887766',
  'Fisioterapeuta',
  'Mogi Guaçu/SP',
  'Indicação',
  'proposta_enviada',
  'Cliente fictício de demonstração. Pode ser excluído pela administração.'
)
on conflict (id) do nothing;

insert into public.form_envios (
  id, cliente_id, template_id, versao_template, token_hash, expira_em, status, canal, enviado_em, aberto_em, respondido_em
) values (
  '${ID.envio}',
  '${ID.cliente}',
  '${ID.template}',
  ${VERSAO_TEMPLATE},
  '${hash(TOKEN_FORMULARIO)}',
  timestamptz '2027-12-31 23:59:00-03',
  'respondido',
  'link',
  now(),
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.form_respostas (
  id, envio_id, respostas, progresso_percentual, consentimento_lgpd_em, ip, user_agent, submitted_at
) values (
  '${ID.respostas}',
  '${ID.envio}',
  ${sqlJson(respostas)},
  100,
  now(),
  '127.0.0.1',
  'seed-demonstracao',
  now()
)
on conflict (id) do nothing;

insert into public.diagnosticos (
  id, cliente_id, envio_id, versao_motor, premissas, resultados, alertas, status, revisado_em
) values (
  '${ID.diagnostico}',
  '${ID.cliente}',
  '${ID.envio}',
  '${VERSAO_MOTOR}',
  ${sqlJson(premissas)},
  ${sqlJson(resultados)},
  ${sqlJson(resultado.alertas)},
  'revisado',
  now()
)
on conflict (id) do nothing;

insert into public.propostas (
  id, numero, cliente_id, envio_id, diagnostico_id, status, validade_dias,
  total_mensal, total_avulso, condicoes_pagamento, escopo_incluso, escopo_nao_incluso,
  observacoes, token_hash_aceite, enviada_em
) values (
  '${ID.proposta}',
  '2026/0001',
  '${ID.cliente}',
  '${ID.envio}',
  '${ID.diagnostico}',
  'enviada',
  15,
  ${itens.total_mensal},
  ${itens.total_avulso},
  ${sqlTexto(CONDICOES_PAGAMENTO_PADRAO)},
  ${sqlTexto(ESCOPO_INCLUSO_PADRAO)},
  ${sqlTexto(ESCOPO_NAO_INCLUSO_PADRAO)},
  'Proposta de demonstração gerada com os serviços ligados às prioridades da Helena.',
  '${hash(TOKEN_PROPOSTA)}',
  now()
)
on conflict (id) do nothing;

insert into public.proposta_itens (
  id, proposta_id, servico_id, descricao, quantidade, valor_unitario, desconto, valor_total, tipo, ordem, prioridade_origem
) values
${itensSql}
on conflict (id) do nothing;

insert into public.eventos (entidade, entidade_id, acao, dados)
select * from (values
  ('cliente'::text, '${ID.cliente}'::uuid, 'cliente_criado'::text, '{"origem":"seed_demo"}'::jsonb),
  ('form_envio', '${ID.envio}'::uuid, 'formulario_respondido', '{"origem":"seed_demo"}'::jsonb),
  ('diagnostico', '${ID.diagnostico}'::uuid, 'diagnostico_revisado', '{"origem":"seed_demo","versao_motor":"${VERSAO_MOTOR}"}'::jsonb),
  ('proposta', '${ID.proposta}'::uuid, 'proposta_enviada', '{"origem":"seed_demo","numero":"2026/0001"}'::jsonb)
) as semente(entidade, entidade_id, acao, dados)
where not exists (
  select 1 from public.eventos e
  where e.entidade = semente.entidade and e.entidade_id = semente.entidade_id and e.acao = semente.acao
);
`;

writeFileSync("supabase/migrations/20260924120400_template_formulario.sql", templateSql);
writeFileSync("supabase/migrations/20260924120500_demo.sql", demoSql);
console.log("template e demo gravados");
console.log("form", hash(TOKEN_FORMULARIO));
console.log("proposta", hash(TOKEN_PROPOSTA));
console.log("mensal", itens.total_mensal, "avulso", itens.total_avulso);
console.log("alertas", resultado.alertas.map((alerta) => alerta.codigo).join(", "));
