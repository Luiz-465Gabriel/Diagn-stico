create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  tipo text not null check (tipo in ('mensal', 'avulso')),
  valor_base numeric not null default 0,
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.mapa_prioridade_servico (
  id uuid primary key default gen_random_uuid(),
  prioridade text not null,
  servico_id uuid not null references public.servicos (id) on delete cascade,
  unique (prioridade, servico_id)
);

create table public.propostas (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  envio_id uuid references public.form_envios (id) on delete set null,
  diagnostico_id uuid references public.diagnosticos (id) on delete set null,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviada', 'aceita', 'recusada', 'expirada')),
  validade_dias integer not null default 15,
  total_mensal numeric not null default 0,
  total_avulso numeric not null default 0,
  condicoes_pagamento text,
  escopo_incluso text,
  escopo_nao_incluso text,
  observacoes text,
  pdf_path text,
  token_hash_aceite text unique,
  enviada_em timestamptz,
  aceita_em timestamptz,
  aceite_nome text,
  aceite_ip text,
  motivo_recusa text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.proposta_itens (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null references public.propostas (id) on delete cascade,
  servico_id uuid references public.servicos (id) on delete set null,
  descricao text not null,
  quantidade numeric not null default 1,
  valor_unitario numeric not null default 0,
  desconto numeric not null default 0,
  valor_total numeric not null default 0,
  tipo text not null check (tipo in ('mensal', 'avulso')),
  ordem integer not null default 0,
  prioridade_origem text
);

create index propostas_cliente_idx on public.propostas (cliente_id, created_at desc);

create trigger propostas_updated_at before update on public.propostas
for each row execute function public.set_updated_at();

-- Numeração AAAA/0001 no fuso de São Paulo, com trava para não repetir.
create or replace function public.proximo_numero_proposta()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  ano integer := extract(year from (now() at time zone 'America/Sao_Paulo'));
  proximo integer;
begin
  perform pg_advisory_xact_lock(hashtext('proposta-' || ano::text));
  select coalesce(max(split_part(numero, '/', 2)::integer), 0) + 1
    into proximo
  from public.propostas
  where numero like ano::text || '/%';
  return ano::text || '/' || lpad(proximo::text, 4, '0');
end;
$$;

grant execute on function public.proximo_numero_proposta() to authenticated, service_role;

alter table public.servicos enable row level security;
alter table public.mapa_prioridade_servico enable row level security;
alter table public.propostas enable row level security;
alter table public.proposta_itens enable row level security;

create policy servicos_select on public.servicos for select to authenticated using (public.is_equipe());
create policy servicos_write on public.servicos for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

create policy mapa_select on public.mapa_prioridade_servico for select to authenticated using (public.is_equipe());
create policy mapa_write on public.mapa_prioridade_servico for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

create policy propostas_select on public.propostas for select to authenticated using (public.is_equipe());
create policy propostas_insert on public.propostas for insert to authenticated with check (public.is_equipe());
create policy propostas_update on public.propostas for update to authenticated using (public.is_equipe()) with check (public.is_equipe());

create policy itens_select on public.proposta_itens for select to authenticated using (public.is_equipe());
create policy itens_insert on public.proposta_itens for insert to authenticated with check (public.is_equipe());
create policy itens_update on public.proposta_itens for update to authenticated using (public.is_equipe()) with check (public.is_equipe());
create policy itens_delete on public.proposta_itens for delete to authenticated using (public.is_equipe());

revoke all on public.servicos, public.mapa_prioridade_servico, public.propostas, public.proposta_itens from anon;
grant select, insert, update, delete on public.servicos, public.mapa_prioridade_servico, public.propostas, public.proposta_itens to authenticated;
grant all on public.servicos, public.mapa_prioridade_servico, public.propostas, public.proposta_itens to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('propostas', 'propostas', false, 26214400, array['application/pdf'])
on conflict (id) do nothing;

-- Valores de referência do catálogo. O escritório altera no painel; não são regra de preço do sistema.
insert into public.servicos (id, nome, descricao, tipo, valor_base, ordem) values
  ('a1000000-0000-4000-8000-000000000001', 'Planejamento de abertura', 'Valor de referência editável. Custos, caixa e capital para abrir.', 'avulso', 1800, 1),
  ('a1000000-0000-4000-8000-000000000002', 'Precificação e metas', 'Valor de referência editável. Preço mínimo, meta de atendimentos e ocupação.', 'avulso', 1400, 2),
  ('a1000000-0000-4000-8000-000000000003', 'Organização financeira', 'Valor de referência editável. Retirada mensal e separação do caixa.', 'avulso', 1200, 3),
  ('a1000000-0000-4000-8000-000000000004', 'Rotina de cobranças', 'Valor de referência editável. Política de recebimento e redução de atrasos.', 'avulso', 900, 4),
  ('a1000000-0000-4000-8000-000000000005', 'Regularização fiscal e notas', 'Valor de referência editável. CNPJ, regime e rotina de notas.', 'avulso', 1600, 5),
  ('a1000000-0000-4000-8000-000000000006', 'Planejamento de equipe', 'Valor de referência editável. Remuneração de outra profissional.', 'avulso', 1100, 6),
  ('a1000000-0000-4000-8000-000000000007', 'Orientação de abertura', 'Valor de referência editável. Encontro inicial para organizar a abertura.', 'avulso', 700, 7),
  ('a1000000-0000-4000-8000-000000000008', 'Contabilidade mensal', 'Valor de referência editável. Acompanhamento contábil mensal.', 'mensal', 800, 8),
  ('a1000000-0000-4000-8000-000000000009', 'Contabilidade e acompanhamento financeiro', 'Valor de referência editável. Contabilidade mensal com rotina financeira.', 'mensal', 1400, 9);

insert into public.mapa_prioridade_servico (prioridade, servico_id) values
  ('Planejar os custos e o dinheiro necessário para abrir', 'a1000000-0000-4000-8000-000000000001'),
  ('Definir preços e metas de atendimento', 'a1000000-0000-4000-8000-000000000002'),
  ('Organizar as finanças e minha retirada mensal', 'a1000000-0000-4000-8000-000000000003'),
  ('Melhorar as cobranças e reduzir atrasos', 'a1000000-0000-4000-8000-000000000004'),
  ('Avaliar o CNPJ e organizar impostos e notas', 'a1000000-0000-4000-8000-000000000005'),
  ('Planejar a remuneração e a contratação de outra profissional', 'a1000000-0000-4000-8000-000000000006'),
  ('Orientação inicial para organizar a abertura', 'a1000000-0000-4000-8000-000000000007'),
  ('Acompanhamento mensal contábil', 'a1000000-0000-4000-8000-000000000008'),
  ('Acompanhamento mensal contábil e financeiro', 'a1000000-0000-4000-8000-000000000009');
