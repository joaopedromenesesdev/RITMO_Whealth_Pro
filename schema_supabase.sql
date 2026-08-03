-- =============================================================================
-- SCHEMAS & POLÍTICAS DE SEGURANÇA (RLS) PARA SUPABASE / POSTGRESQL
-- Whealth Planner Pro (Pace Capital)
-- =============================================================================

-- 1. TABELA DE PERFIS DE USUÁRIOS (PROFILES)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role text default 'assessor' check (role in ('master', 'assessor')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ativar RLS em profiles
alter table public.profiles enable row level security;

-- Políticas de RLS em profiles
create policy "Usuários podem ler seus próprios dados de perfil"
  on public.profiles for select
  using (auth.uid() = id or exists (
    select 1 from public.profiles where id = auth.uid() and role = 'master'
  ));

create policy "Usuários podem atualizar seus próprios dados de perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger para criar perfil automaticamente no cadastro
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'Assessor'),
    coalesce(new.raw_user_meta_data->>'role', 'assessor')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. TABELA DE CONVITES DE ACESSO (INVITES)
create table if not exists public.invites (
  id text primary key,
  email_restrito text,
  used boolean default false,
  used_at timestamptz,
  used_by text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Ativar RLS em invites
alter table public.invites enable row level security;

-- Leitura de convite é permitida (para validar na tela de cadastro)
create policy "Permitir validação pública de convites não utilizados"
  on public.invites for select
  using (true);

-- Apenas Masters podem criar convites
create policy "Apenas usuários master podem criar novos convites"
  on public.invites for insert
  with check (
    exists (
      select 1 from public.profiles where id = auth.uid() and role = 'master'
    )
  );

-- Atualização de convite (para marcar como usado)
create policy "Permitir marcar convite como usado"
  on public.invites for update
  using (used = false);


-- 3. TABELA DE RELATÓRIOS E SIMULAÇÕES (RELATORIOS)
create table if not exists public.relatorios (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  nome_cliente text not null,
  nome_assessor text,
  total_patrimonio numeric(18,2) default 0,
  prejuizo_tributario numeric(18,2) default 0,
  dados_completos jsonb default '{}'::jsonb,
  data_criacao timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índices para buscas rápidas
create index if not exists idx_relatorios_user_id on public.relatorios(user_id);
create index if not exists idx_relatorios_data_criacao on public.relatorios(data_criacao desc);
create index if not exists idx_relatorios_nome_cliente on public.relatorios using gin (to_tsvector('portuguese', nome_cliente));

-- Ativar RLS em relatorios
alter table public.relatorios enable row level security;

-- Políticas de RLS em relatorios
create policy "Usuários podem ver apenas seus próprios relatórios"
  on public.relatorios for select
  using (
    auth.uid() = user_id or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'master'
    )
  );

create policy "Usuários podem criar relatórios para si mesmos"
  on public.relatorios for insert
  with check (auth.uid() = user_id);

create policy "Usuários podem atualizar seus próprios relatórios"
  on public.relatorios for update
  using (auth.uid() = user_id);

create policy "Usuários podem deletar seus próprios relatórios"
  on public.relatorios for delete
  using (auth.uid() = user_id);


-- 4. TABELA DE AUDITORIA E COMPLIANCE (AUDIT_LOGS)
create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  relatorio_id text,
  acao text not null, -- 'CRIAR', 'ATUALIZAR', 'EXCLUIR', 'EXPORTAR_PDF'
  detalhes jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.audit_logs enable row level security;

create policy "Usuários podem ver seus próprios logs ou master ver todos"
  on public.audit_logs for select
  using (
    auth.uid() = user_id or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'master'
    )
  );

create policy "Usuários podem registrar eventos de auditoria"
  on public.audit_logs for insert
  with check (auth.uid() = user_id or user_id is null);

