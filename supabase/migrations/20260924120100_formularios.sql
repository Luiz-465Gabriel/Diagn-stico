-- Formulários públicos: o token em claro nunca é gravado, só o hash SHA-256.

create table public.form_templates (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  versao integer not null default 1,
  schema jsonb not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (nome, versao)
);

create table public.form_envios (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  template_id uuid not null references public.form_templates (id),
  versao_template integer not null,
  token_hash text not null unique,
  expira_em timestamptz not null,
  status text not null default 'enviado' check (
    status in ('enviado', 'aberto', 'em_andamento', 'respondido', 'expirado', 'cancelado')
  ),
  canal text not null check (canal in ('whatsapp', 'email', 'link')),
  enviado_em timestamptz,
  aberto_em timestamptz,
  respondido_em timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index form_envios_cliente_idx on public.form_envios (cliente_id, created_at desc);
create index form_envios_status_idx on public.form_envios (status);

create table public.form_respostas (
  id uuid primary key default gen_random_uuid(),
  envio_id uuid not null unique references public.form_envios (id) on delete cascade,
  respostas jsonb not null default '{}'::jsonb,
  progresso_percentual numeric not null default 0,
  consentimento_lgpd_em timestamptz,
  ip text,
  user_agent text,
  updated_at timestamptz not null default now(),
  submitted_at timestamptz
);

create trigger form_respostas_updated_at before update on public.form_respostas
for each row execute function public.set_updated_at();

alter table public.form_templates enable row level security;
alter table public.form_envios enable row level security;
alter table public.form_respostas enable row level security;

create policy templates_select on public.form_templates for select to authenticated using (public.is_equipe());
create policy templates_write on public.form_templates for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy envios_select on public.form_envios for select to authenticated using (public.is_equipe());
create policy envios_insert on public.form_envios for insert to authenticated with check (public.is_equipe());
create policy envios_update on public.form_envios for update to authenticated using (public.is_equipe()) with check (public.is_equipe());

create policy respostas_select on public.form_respostas for select to authenticated using (public.is_equipe());
create policy respostas_insert on public.form_respostas for insert to authenticated with check (public.is_equipe());
create policy respostas_update on public.form_respostas for update to authenticated using (public.is_equipe()) with check (public.is_equipe());

revoke all on public.form_templates, public.form_envios, public.form_respostas from anon;
grant select, insert, update, delete on public.form_templates, public.form_envios, public.form_respostas to authenticated;
grant all on public.form_templates, public.form_envios, public.form_respostas to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'form-uploads',
  'form-uploads',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marca',
  'marca',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set public = excluded.public;

create policy equipe_le_arquivos on storage.objects
  for select to authenticated
  using (bucket_id in ('form-uploads', 'marca', 'propostas') and public.is_equipe());

create policy publico_le_marca on storage.objects
  for select to public
  using (bucket_id = 'marca');

create policy equipe_grava_marca on storage.objects
  for insert to authenticated
  with check (bucket_id = 'marca' and public.is_equipe());

create policy equipe_atualiza_marca on storage.objects
  for update to authenticated
  using (bucket_id = 'marca' and public.is_equipe());
