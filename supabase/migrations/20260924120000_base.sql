-- EMPMED Propostas: perfis, clientes, escritório e auditoria.
-- Nenhuma tabela fica acessível ao papel anon. A equipe autenticada passa por RLS.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null,
  perfil text not null default 'colaborador' check (perfil in ('admin', 'colaborador')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('PF', 'PJ')),
  nome text not null,
  razao_social text,
  cpf_cnpj text not null unique,
  email text,
  whatsapp text,
  profissao_especialidade text,
  cidade_uf text,
  origem_lead text,
  responsavel_id uuid references public.profiles (id) on delete set null,
  status_funil text not null default 'lead' check (
    status_funil in ('lead', 'diagnostico_enviado', 'diagnostico_respondido', 'proposta_enviada', 'fechado', 'perdido')
  ),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clientes_documento_digitos check (cpf_cnpj ~ '^[0-9]{11}$' or cpf_cnpj ~ '^[0-9]{14}$')
);

create index clientes_funil_idx on public.clientes (status_funil);
create index clientes_responsavel_idx on public.clientes (responsavel_id);

create table public.configuracoes_escritorio (
  id integer primary key default 1 check (id = 1),
  razao_social text not null default 'EMPMED ASSESSORIA CONTÁBIL',
  cnpj text,
  crc text,
  endereco text,
  telefone text,
  email text,
  logo_path text,
  cores_tema jsonb not null default jsonb_build_object(
    'primaria', '#0E2A47',
    'secundaria', '#F0A202',
    'fundo', '#E7EEF6',
    'texto', '#142033',
    'destaque', '#1565C0'
  ),
  updated_at timestamptz not null default now()
);

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  entidade text not null,
  entidade_id uuid,
  acao text not null,
  dados jsonb not null default '{}'::jsonb,
  usuario_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index eventos_entidade_idx on public.eventos (entidade, entidade_id, created_at desc);

create trigger clientes_updated_at before update on public.clientes
for each row execute function public.set_updated_at();

create trigger configuracoes_updated_at before update on public.configuracoes_escritorio
for each row execute function public.set_updated_at();

-- Funções em SQL são validadas na hora. As tabelas precisam existir antes.
create or replace function public.is_equipe()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.ativo = true
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.ativo = true and p.perfil = 'admin'
  );
$$;

-- Perfil criado junto com o usuário do Auth. Não há cadastro público na aplicação.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email, perfil, ativo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    case
      when new.raw_user_meta_data ->> 'perfil' in ('admin', 'colaborador') then new.raw_user_meta_data ->> 'perfil'
      else 'colaborador'
    end,
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.clientes enable row level security;
alter table public.configuracoes_escritorio enable row level security;
alter table public.eventos enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated using (public.is_equipe());

create policy clientes_select on public.clientes
  for select to authenticated using (public.is_equipe());
create policy clientes_insert on public.clientes
  for insert to authenticated with check (public.is_equipe());
create policy clientes_update on public.clientes
  for update to authenticated using (public.is_equipe()) with check (public.is_equipe());
create policy clientes_delete on public.clientes
  for delete to authenticated using (public.is_admin());

create policy config_select on public.configuracoes_escritorio
  for select to authenticated using (public.is_equipe());
create policy config_insert on public.configuracoes_escritorio
  for insert to authenticated with check (public.is_equipe());
create policy config_update on public.configuracoes_escritorio
  for update to authenticated using (public.is_equipe()) with check (public.is_equipe());

create policy eventos_select on public.eventos
  for select to authenticated using (public.is_equipe());
create policy eventos_insert on public.eventos
  for insert to authenticated with check (public.is_equipe());

insert into public.configuracoes_escritorio (id, razao_social, cnpj, crc, endereco, telefone, email)
values (
  1,
  'EMPMED ASSESSORIA CONTÁBIL',
  '45821937000166',
  'CRC a informar',
  'Mogi Guaçu/SP',
  '',
  ''
);

revoke all on public.profiles, public.clientes, public.configuracoes_escritorio, public.eventos from anon;
grant select, insert, update, delete on public.profiles, public.clientes, public.configuracoes_escritorio, public.eventos to authenticated;
grant all on public.profiles, public.clientes, public.configuracoes_escritorio, public.eventos to service_role;
