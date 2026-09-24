-- Parâmetros editáveis pelo painel. Nenhuma alíquota fica fixa na aplicação.

create table public.parametros_tributarios (
  id uuid primary key default gen_random_uuid(),
  regime text not null check (regime in ('PF_CARNE_LEAO', 'SIMPLES_ANEXO_III', 'SIMPLES_ANEXO_V', 'LUCRO_PRESUMIDO')),
  vigencia_inicio date not null,
  vigencia_fim date,
  parametros jsonb not null,
  fonte_legal text not null,
  created_at timestamptz not null default now()
);

create table public.parametros_municipais (
  id uuid primary key default gen_random_uuid(),
  municipio_uf text not null unique,
  aliquota_iss numeric not null check (aliquota_iss >= 0 and aliquota_iss <= 1),
  observacoes text
);

create table public.parametros_diagnostico (
  chave text primary key,
  valor numeric not null,
  descricao text not null,
  tipo text not null default 'numero' check (tipo in ('numero', 'percentual', 'moeda'))
);

create table public.diagnosticos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  envio_id uuid references public.form_envios (id) on delete set null,
  versao_motor text not null,
  premissas jsonb not null,
  resultados jsonb not null,
  alertas jsonb not null default '[]'::jsonb,
  status text not null default 'rascunho' check (status in ('rascunho', 'revisado')),
  revisado_por uuid references public.profiles (id) on delete set null,
  revisado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index diagnosticos_cliente_idx on public.diagnosticos (cliente_id, created_at desc);

create trigger diagnosticos_updated_at before update on public.diagnosticos
for each row execute function public.set_updated_at();

alter table public.parametros_tributarios enable row level security;
alter table public.parametros_municipais enable row level security;
alter table public.parametros_diagnostico enable row level security;
alter table public.diagnosticos enable row level security;

create policy trib_select on public.parametros_tributarios for select to authenticated using (public.is_equipe());
create policy trib_write on public.parametros_tributarios for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

create policy mun_select on public.parametros_municipais for select to authenticated using (public.is_equipe());
create policy mun_write on public.parametros_municipais for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

create policy diag_param_select on public.parametros_diagnostico for select to authenticated using (public.is_equipe());
create policy diag_param_write on public.parametros_diagnostico for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

create policy diagnosticos_select on public.diagnosticos for select to authenticated using (public.is_equipe());
create policy diagnosticos_insert on public.diagnosticos for insert to authenticated with check (public.is_equipe());
create policy diagnosticos_update on public.diagnosticos for update to authenticated using (public.is_equipe()) with check (public.is_equipe());

revoke all on public.parametros_tributarios, public.parametros_municipais, public.parametros_diagnostico, public.diagnosticos from anon;
grant select, insert, update, delete on public.parametros_tributarios, public.parametros_municipais, public.parametros_diagnostico, public.diagnosticos to authenticated;
grant all on public.parametros_tributarios, public.parametros_municipais, public.parametros_diagnostico, public.diagnosticos to service_role;

insert into public.parametros_diagnostico (chave, valor, tipo, descricao) values
  ('semanas_por_mes', 4.33, 'numero', 'Semanas consideradas em um mês'),
  ('ocupacao_maxima_saudavel', 0.85, 'percentual', 'Ocupação máxima usada como teto saudável da agenda'),
  ('taxa_cartao_media', 0.03, 'percentual', 'Taxa média de cartão sobre a receita'),
  ('inadimplencia_estimada', 0.03, 'percentual', 'Perda estimada por inadimplência'),
  ('meses_rampa', 4, 'numero', 'Meses de rampa de crescimento da carteira'),
  ('crescimento_mensal_pacientes', 0.10, 'percentual', 'Crescimento mensal de pacientes durante a rampa'),
  ('meses_capital_de_giro', 3, 'numero', 'Meses de custo fixo reservados como capital de giro'),
  ('meses_reserva_pessoal', 3, 'numero', 'Meses de retirada que a reserva pessoal deveria cobrir'),
  ('margem_seguranca_cenario_ideal', 0.20, 'percentual', 'Folga do cenário ideal sobre custos e retirada'),
  ('reducao_cenario_conservador', 0.20, 'percentual', 'Redução de volume do cenário conservador'),
  ('honorario_contabil_padrao', 800, 'moeda', 'EXEMPLO — VALIDAR. Honorário mensal usado quando o cliente não informa o valor'),
  ('limite_premissas_estimadas_alerta', 0.30, 'percentual', 'Acima deste percentual de premissas estimadas o relatório avisa baixa precisão'),
  ('ocupacao_alerta_alta', 0.70, 'percentual', 'Ocupação necessária acima deste valor gera alerta alto'),
  ('ocupacao_alerta_media', 0.50, 'percentual', 'Ocupação necessária a partir deste valor gera alerta médio'),
  ('limite_parcelas_sobre_receita', 0.15, 'percentual', 'Parcelas acima deste percentual da receita geram alerta'),
  ('gastos_mensais_sugeridos', 0, 'moeda', 'Sugestão quando o cliente ainda não estimou os gastos do espaço. Confirmar na revisão'),
  ('dias_semana_padrao', 5, 'numero', 'Sugestão de dias por semana quando o cliente marca Não sei'),
  ('horas_dia_padrao', 6, 'numero', 'Sugestão de horas por dia quando o cliente marca Não sei'),
  ('pessoas_grupo_padrao', 1, 'numero', 'Sugestão conservadora de pessoas por horário de grupo quando o cliente não informa');

-- Tabelas de exemplo. A fonte deixa explícito que precisam ser validadas antes do uso.
insert into public.parametros_tributarios (regime, vigencia_inicio, parametros, fonte_legal) values
(
  'PF_CARNE_LEAO',
  '2026-01-01',
  jsonb_build_object(
    'faixas_mensais', jsonb_build_array(
      jsonb_build_object('limite', 2428.80, 'aliquota', 0, 'deducao', 0),
      jsonb_build_object('limite', 2826.65, 'aliquota', 0.075, 'deducao', 182.16),
      jsonb_build_object('limite', 3751.05, 'aliquota', 0.15, 'deducao', 394.16),
      jsonb_build_object('limite', 4664.68, 'aliquota', 0.225, 'deducao', 675.49),
      jsonb_build_object('limite', null, 'aliquota', 0.275, 'deducao', 908.73)
    ),
    'inss_aliquota', 0.20,
    'inss_teto', 8157.41,
    'inss_piso', 1518.00,
    'deduz_inss_base_ir', true,
    'inss_minimo_obrigatorio', true
  ),
  'EXEMPLO — VALIDAR antes de usar em produção. Tabela progressiva mensal do IRPF e INSS de contribuinte individual (20% entre piso e teto), referência ilustrativa. Não é a tabela oficial vigente.'
),
(
  'SIMPLES_ANEXO_III',
  '2026-01-01',
  jsonb_build_object(
    'anexo', 'III',
    'fator_r_limite', 0.28,
    'faixas', jsonb_build_array(
      jsonb_build_object('limite_rbt12', 180000, 'aliquota', 0.06, 'deducao', 0),
      jsonb_build_object('limite_rbt12', 360000, 'aliquota', 0.112, 'deducao', 9360),
      jsonb_build_object('limite_rbt12', 720000, 'aliquota', 0.135, 'deducao', 17640),
      jsonb_build_object('limite_rbt12', 1800000, 'aliquota', 0.16, 'deducao', 35640),
      jsonb_build_object('limite_rbt12', 3600000, 'aliquota', 0.21, 'deducao', 125640),
      jsonb_build_object('limite_rbt12', 4800000, 'aliquota', 0.33, 'deducao', 648000)
    )
  ),
  'EXEMPLO — VALIDAR. Simples Nacional, Anexo III, faixas ilustrativas da LC nº 123/2006. O fator R (art. 18) usa o limite cadastrado aqui. Conferir vigência e a transição da LC nº 214/2025.'
),
(
  'SIMPLES_ANEXO_V',
  '2026-01-01',
  jsonb_build_object(
    'anexo', 'V',
    'fator_r_limite', 0.28,
    'faixas', jsonb_build_array(
      jsonb_build_object('limite_rbt12', 180000, 'aliquota', 0.155, 'deducao', 0),
      jsonb_build_object('limite_rbt12', 360000, 'aliquota', 0.18, 'deducao', 4500),
      jsonb_build_object('limite_rbt12', 720000, 'aliquota', 0.195, 'deducao', 9900),
      jsonb_build_object('limite_rbt12', 1800000, 'aliquota', 0.205, 'deducao', 17100),
      jsonb_build_object('limite_rbt12', 3600000, 'aliquota', 0.23, 'deducao', 62100),
      jsonb_build_object('limite_rbt12', 4800000, 'aliquota', 0.305, 'deducao', 540000)
    )
  ),
  'EXEMPLO — VALIDAR. Simples Nacional, Anexo V, faixas ilustrativas da LC nº 123/2006. Conferir a atividade real e a LC nº 214/2025.'
),
(
  'LUCRO_PRESUMIDO',
  '2026-01-01',
  jsonb_build_object(
    'percentual_presuncao_irpj', 0.32,
    'percentual_presuncao_csll', 0.32,
    'aliquota_irpj', 0.15,
    'aliquota_adicional_irpj', 0.10,
    'limite_adicional_mensal', 20000,
    'aliquota_csll', 0.09,
    'aliquota_pis', 0.0065,
    'aliquota_cofins', 0.03,
    'aliquota_cbs', 0,
    'aliquota_ibs', 0
  ),
  'EXEMPLO — VALIDAR. IRPJ, adicional, CSLL, PIS e COFINS ilustrativos para serviços. ISS vem do município. CBS e IBS (LC nº 214/2025) ficam em zero até a vigência ser cadastrada.'
);

insert into public.parametros_municipais (municipio_uf, aliquota_iss, observacoes) values
  ('Mogi Guaçu/SP', 0.02, 'EXEMPLO — VALIDAR a alíquota de ISS de Mogi Guaçu/SP para o serviço prestado.'),
  ('Campinas/SP', 0.02, 'EXEMPLO — VALIDAR.'),
  ('São Paulo/SP', 0.02, 'EXEMPLO — VALIDAR. Serviços de saúde podem ter alíquota própria.');
