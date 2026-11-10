-- =============================================================================
-- MIGRAÇÃO: ADIÇÃO DE CONTA MASTER — WILLIANS NOVAIS (2026-11-10)
-- Whealth Planner Pro (Pace Capital)
-- Objetivo: Conceder privilégio de Master para willians.novais@pacecapital.com.br
-- Arquitetura Zero-Leakage: Autorização centralizada no servidor (RLS + Profiles)
-- Idempotente: Executável com segurança múltiplas vezes no Supabase SQL Editor
-- =============================================================================

-- 1. Promover Willians Novais na tabela public.profiles caso já exista perfil
update public.profiles
set role = 'master',
    updated_at = now()
where lower(trim(email)) = 'willians.novais@pacecapital.com.br';

-- 2. Sincronizar de auth.users para public.profiles caso já tenha conta criada no Auth
insert into public.profiles (id, email, full_name, role, ultimo_acesso, created_at, updated_at)
select
  u.id,
  u.email,
  coalesce(
    nullif(nullif(u.raw_user_meta_data->>'full_name', ''), '-'),
    'Willians Novais'
  ),
  'master',
  coalesce(u.last_sign_in_at, u.created_at, now()),
  coalesce(u.created_at, now()),
  now()
from auth.users u
where lower(trim(u.email)) = 'willians.novais@pacecapital.com.br'
on conflict (id) do update set
  role = 'master',
  email = excluded.email,
  full_name = coalesce(nullif(nullif(public.profiles.full_name, ''), '-'), excluded.full_name),
  updated_at = now();

-- 3. Atualizar a função public.is_master() com verificação em múltiplas camadas
-- (Reconhece role = 'master', UID primário ou e-mails master autorizados via servidor)
create or replace function public.is_master()
returns boolean as $$
begin
  return (
    auth.uid() = '130e3598-89b9-4702-a4cc-2c5923fa3a66'::uuid
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
        and (
          role = 'master'
          or lower(trim(email)) in (
            'willians.novais@pacecapital.com.br'
          )
        )
    )
    or lower(trim(coalesce(auth.jwt()->>'email', ''))) in (
      'willians.novais@pacecapital.com.br'
    )
  );
end;
$$ language plpgsql security definer set search_path = public stable;

-- 4. Atualizar o trigger de novos usuários para garantir que, caso Willians crie a conta
-- posteriormente via convite ou link, receba automaticamente o papel de 'master'
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_role text := 'assessor';
  v_email_norm text := lower(trim(coalesce(new.email, '')));
begin
  -- Identifica contas master autorizadas no momento do cadastro
  if v_email_norm in (
    'willians.novais@pacecapital.com.br'
  ) or new.id = '130e3598-89b9-4702-a4cc-2c5923fa3a66'::uuid then
    v_role := 'master';
  end if;

  insert into public.profiles (id, email, full_name, role, ultimo_acesso, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(nullif(new.raw_user_meta_data->>'full_name', ''), '-'),
      case when v_email_norm = 'willians.novais@pacecapital.com.br' then 'Willians Novais' else 'Assessor' end
    ),
    v_role,
    now(),
    now(),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(nullif(public.profiles.full_name, ''), '-'), excluded.full_name),
    role = case
      when v_role = 'master' then 'master'
      else public.profiles.role
    end,
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Reassocia o trigger na tabela auth.users se necessário
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Atualizar a RPC de usabilidade master para identificar Willians como Master nas métricas
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
        case when lower(trim(coalesce(p.email, u.email, ''))) = 'willians.novais@pacecapital.com.br' then 'Willians Novais' end,
        initcap(replace(split_part(coalesce(p.email, u.email), '@', 1), '.', ' '))
      ),
      'role', case
        when coalesce(p.id, u.id) = '130e3598-89b9-4702-a4cc-2c5923fa3a66'::uuid then 'master'
        when lower(trim(coalesce(p.email, u.email, ''))) in ('willians.novais@pacecapital.com.br') then 'master'
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

-- 6. Consulta de auditoria para confirmação imediata
select id, email, full_name, role, ultimo_acesso, created_at
from public.profiles
where role = 'master'
   or lower(trim(email)) = 'willians.novais@pacecapital.com.br';
