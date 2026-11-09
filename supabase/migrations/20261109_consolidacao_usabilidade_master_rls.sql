-- =============================================================================
-- MIGRAÇÃO CONSOLIDADA: USABILIDADE MASTER, RLS DE PROFILES & RPC (2026-11-09)
-- Whealth Planner Pro (Pace Capital)
-- Arquitetura Zero-Leakage: Nenhum e-mail ou dado pessoal exposto no código SQL
-- Executável de forma 100% idempotente e à prova de tabelas opcionais ausentes
-- =============================================================================

-- 1. Garantir estrutura completa de public.profiles e todas as colunas necessárias
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  role text default 'assessor',
  ultimo_acesso timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists role text default 'assessor';
alter table public.profiles add column if not exists ultimo_acesso timestamptz default now();
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

-- Atualizar constraint de role para aceitar 'master' sem conflito com schemas antigos
do $$
declare
  r record;
begin
  for r in (
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  ) loop
    execute format('alter table public.profiles drop constraint if exists %I', r.conname);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_role_check check (role in ('master', 'assessor', 'admin'));

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_ultimo_acesso on public.profiles(ultimo_acesso desc);

-- 2. Atualizar função public.is_master() para reconhecer imediatamente o UID Master
-- ou qualquer registro com role = 'master' em public.profiles
create or replace function public.is_master()
returns boolean as $$
begin
  return (
    auth.uid() = '130e3598-89b9-4702-a4cc-2c5923fa3a66'::uuid
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'master'
    )
  );
end;
$$ language plpgsql security definer set search_path = public stable;

-- 3. Sincronizar todos os usuários existentes em auth.users para public.profiles
-- Garante que todos os assessores convidados pelo Supabase Auth possuam perfil
insert into public.profiles (id, email, full_name, role, ultimo_acesso, created_at, updated_at)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(
    nullif(nullif(u.raw_user_meta_data->>'full_name', ''), '-'),
    initcap(replace(split_part(coalesce(u.email, ''), '@', 1), '.', ' ')),
    'Assessor'
  ),
  case
    when u.id = '130e3598-89b9-4702-a4cc-2c5923fa3a66'::uuid then 'master'
    else 'assessor'
  end,
  coalesce(u.last_sign_in_at, u.created_at, now()),
  coalesce(u.created_at, now()),
  now()
from auth.users u
on conflict (id) do update set
  email = coalesce(nullif(excluded.email, ''), public.profiles.email),
  full_name = coalesce(
    nullif(nullif(public.profiles.full_name, ''), '-'),
    nullif(nullif(excluded.full_name, ''), 'Assessor'),
    excluded.full_name
  ),
  role = case
    when public.profiles.id = '130e3598-89b9-4702-a4cc-2c5923fa3a66'::uuid then 'master'
    else public.profiles.role
  end,
  ultimo_acesso = coalesce(public.profiles.ultimo_acesso, excluded.ultimo_acesso),
  updated_at = now();

-- 4. Garantir promoção explícita do UID Master em public.profiles
update public.profiles
set role = 'master',
    updated_at = now()
where id = '130e3598-89b9-4702-a4cc-2c5923fa3a66'::uuid;

-- 5. Políticas RLS em public.profiles (Permitir que Master leia todos os perfis da equipe)
alter table public.profiles enable row level security;

drop policy if exists "Usuários podem ler seus próprios dados de perfil" on public.profiles;
drop policy if exists "Usuários podem ler seus próprios dados de perfil ou master le todos" on public.profiles;
create policy "Usuários podem ler seus próprios dados de perfil ou master le todos"
  on public.profiles for select
  using (auth.uid() = id or public.is_master());

drop policy if exists "Usuários podem atualizar seus próprios dados de perfil" on public.profiles;
create policy "Usuários podem atualizar seus próprios dados de perfil"
  on public.profiles for update
  using (auth.uid() = id or public.is_master())
  with check (
    (auth.uid() = id and (
      role = (select p.role from public.profiles p where p.id = auth.uid()) or public.is_master()
    ))
    or public.is_master()
  );

-- 6. Políticas RLS em public.relatorios e tabelas auxiliares (se existirem no banco)
do $$
begin
  if to_regclass('public.relatorios') is not null then
    execute 'drop policy if exists "Usuários podem ver apenas seus próprios relatórios" on public.relatorios';
    execute 'drop policy if exists "Usuários podem ver seus próprios relatórios ou master vê todos" on public.relatorios';
    execute 'create policy "Usuários podem ver seus próprios relatórios ou master vê todos" on public.relatorios for select using (auth.uid() = user_id or public.is_master())';

    execute 'drop policy if exists "Usuários podem atualizar seus próprios relatórios" on public.relatorios';
    execute 'drop policy if exists "Usuários podem atualizar seus próprios relatórios ou master atualiza todos" on public.relatorios';
    execute 'create policy "Usuários podem atualizar seus próprios relatórios ou master atualiza todos" on public.relatorios for update using (auth.uid() = user_id or public.is_master()) with check (auth.uid() = user_id or public.is_master())';

    execute 'drop policy if exists "Usuários podem deletar seus próprios relatórios" on public.relatorios';
    execute 'drop policy if exists "Usuários podem deletar seus próprios relatórios ou master deleta todos" on public.relatorios';
    execute 'create policy "Usuários podem deletar seus próprios relatórios ou master deleta todos" on public.relatorios for delete using (auth.uid() = user_id or public.is_master())';
  end if;

  if to_regclass('public.invites') is not null then
    execute 'drop policy if exists "Masters podem ler todos os convites" on public.invites';
    execute 'create policy "Masters podem ler todos os convites" on public.invites for select using (public.is_master())';
  end if;

  if to_regclass('public.audit_logs') is not null then
    execute 'drop policy if exists "Usuários podem ver seus próprios logs ou master ver todos" on public.audit_logs';
    execute 'create policy "Usuários podem ver seus próprios logs ou master ver todos" on public.audit_logs for select using (auth.uid() = user_id or public.is_master())';
  end if;
end $$;

-- 7. Função RPC para registrar o acesso atual do usuário autenticado
create or replace function public.registrar_acesso_usuario()
returns void as $$
begin
  if auth.uid() is not null then
    update public.profiles
    set ultimo_acesso = now(),
        updated_at = now()
    where id = auth.uid();
  end if;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.registrar_acesso_usuario() to authenticated;

-- 8. Função RPC exclusiva para usuários Master consultarem usabilidade completa
-- (Cruza auth.users, public.profiles e public.relatorios com segurança server-side)
create or replace function public.obter_metricas_usabilidade_master()
returns jsonb as $$
declare
  v_res jsonb;
begin
  if not public.is_master() then
    raise exception 'Acesso negado: apenas usuários Master podem consultar métricas de usabilidade.';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'id', coalesce(p.id, u.id),
      'email', coalesce(p.email, u.email),
      'full_name', coalesce(
        nullif(nullif(p.full_name, ''), '-'),
        nullif(nullif(u.raw_user_meta_data->>'full_name', ''), '-'),
        initcap(replace(split_part(coalesce(p.email, u.email), '@', 1), '.', ' '))
      ),
      'role', case
        when coalesce(p.id, u.id) = '130e3598-89b9-4702-a4cc-2c5923fa3a66'::uuid then 'master'
        else coalesce(p.role, 'assessor')
      end,
      'created_at', coalesce(p.created_at, u.created_at),
      'ultimo_acesso', coalesce(p.ultimo_acesso, u.last_sign_in_at, p.updated_at),
      'last_sign_in_at', u.last_sign_in_at,
      'email_confirmed_at', u.email_confirmed_at,
      'total_relatorios', coalesce(r_stats.total_relatorios, 0),
      'total_patrimonio', coalesce(r_stats.total_patrimonio, 0),
      'ultimo_relatorio_em', r_stats.ultimo_relatorio_em
    )
    order by coalesce(p.ultimo_acesso, u.last_sign_in_at, p.created_at, u.created_at) desc nulls last
  ) into v_res
  from auth.users u
  full outer join public.profiles p on p.id = u.id
  left join lateral (
    select
      count(r.id) as total_relatorios,
      coalesce(sum(r.total_patrimonio), 0) as total_patrimonio,
      max(r.data_criacao) as ultimo_relatorio_em
    from public.relatorios r
    where r.user_id = coalesce(p.id, u.id)
  ) r_stats on true;

  return coalesce(v_res, '[]'::jsonb);
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.obter_metricas_usabilidade_master() from anon;
grant execute on function public.obter_metricas_usabilidade_master() to authenticated;
