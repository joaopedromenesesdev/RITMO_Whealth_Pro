-- =============================================================================
-- MIGRAÇÃO: SISTEMA DE USUÁRIOS MASTER & PAINEL DE USABILIDADE (2026-11-04)
-- Whealth Planner Pro (Pace Capital)
-- Arquitetura Zero-Leakage: Nenhum e-mail ou dado pessoal exposto no código SQL
-- Executável de forma idempotente no Supabase SQL Editor
-- =============================================================================

-- 1. Adicionar coluna de último acesso em public.profiles
alter table public.profiles
  add column if not exists ultimo_acesso timestamptz default now();

create index if not exists idx_profiles_ultimo_acesso on public.profiles(ultimo_acesso desc);

-- 1.1. Promover o UID administrativo Master para perfil Master
update public.profiles
set role = 'master',
    updated_at = now()
where id = '130e3598-89b9-4702-a4cc-2c5923fa3a66'::uuid;

-- 1.2. Atualizar função public.is_master() para reconhecer role = 'master' ou UID Master
create or replace function public.is_master()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (role = 'master' or id = '130e3598-89b9-4702-a4cc-2c5923fa3a66'::uuid)
  );
end;
$$ language plpgsql security definer set search_path = public stable;

-- 1.3. Sincronizar defensivamente todos os usuários existentes em auth.users para public.profiles
-- Formatação dinâmica de nomes via algoritmo SQL sem exposição estática de e-mails
insert into public.profiles (id, email, full_name, role)
select
  u.id,
  u.email,
  coalesce(
    nullif(nullif(u.raw_user_meta_data->>'full_name', ''), '-'),
    initcap(replace(split_part(u.email, '@', 1), '.', ' '))
  ),
  case when u.id = '130e3598-89b9-4702-a4cc-2c5923fa3a66'::uuid then 'master' else 'assessor' end
from auth.users u
on conflict (id) do update set
  email = excluded.email,
  full_name = coalesce(nullif(nullif(public.profiles.full_name, ''), '-'), excluded.full_name),
  role = case when public.profiles.id = '130e3598-89b9-4702-a4cc-2c5923fa3a66'::uuid then 'master' else public.profiles.role end;

-- 2. Garantir que usuários Master tenham acesso completo (SELECT, UPDATE, DELETE)
-- aos relatórios gerados pelos assessores
drop policy if exists "Usuários podem ver apenas seus próprios relatórios" on public.relatorios;
create policy "Usuários podem ver seus próprios relatórios ou master vê todos"
  on public.relatorios for select
  using (auth.uid() = user_id or public.is_master());

drop policy if exists "Usuários podem atualizar seus próprios relatórios" on public.relatorios;
create policy "Usuários podem atualizar seus próprios relatórios ou master atualiza todos"
  on public.relatorios for update
  using (auth.uid() = user_id or public.is_master())
  with check (auth.uid() = user_id or public.is_master());

drop policy if exists "Usuários podem deletar seus próprios relatórios" on public.relatorios;
create policy "Usuários podem deletar seus próprios relatórios ou master deleta todos"
  on public.relatorios for delete
  using (auth.uid() = user_id or public.is_master());

-- 3. Função RPC para registrar o acesso atual do usuário autenticado
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

-- 4. Função RPC exclusiva para usuários Master consultarem usabilidade completa
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
