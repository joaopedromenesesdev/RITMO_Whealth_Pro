-- =============================================================================
-- MIGRACAO: HARDENING CRITICO DE AUTH/RLS E NORMALIZACAO DE NOMES (2026-11-11)
-- Whealth Planner Pro (Pace Capital)
-- Arquitetura Zero-Leakage: Nenhum e-mail de assessor exposto estaticamente
-- Idempotente: Executavel com seguranca multiplas vezes no Supabase SQL Editor
--
-- OBJETIVOS:
-- 1. Corrigir vulnerabilidade SQL three-valued NULL em public.is_master() quando
--    auth.uid() for NULL (requisicoes anonimas retornavam NULL em vez de FALSE,
--    permitindo que "if not public.is_master()" fosse ignorado).
-- 2. Revogar permissao de execucao de PUBLIC e anon nas RPCs sensiveis
--    (obter_metricas_usabilidade_master, registrar_acesso_usuario, is_master).
-- 3. Revogar acessos da role anon nas tabelas public.profiles, public.relatorios
--    e public.suporte_chamados (e tabelas auxiliares se existirem).
-- 4. Restaurar normalizacao automatica de full_name e ultimo_acesso nulo ate o
--    primeiro login real no trigger public.handle_new_user(), alem de corrigir
--    perfis existentes gravados como 'Assessor'.
-- =============================================================================

-- 1. Corrigir public.is_master() para nunca retornar NULL (sempre TRUE ou FALSE)
create or replace function public.is_master()
returns boolean as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  return coalesce(
    (
      auth.uid() in (
        '130e3598-89b9-4702-a4cc-2c5923fa3a66'::uuid,
        '5ec2da93-ed07-43f8-9089-6d285a092156'::uuid,
        '469dfeab-5fd6-4159-97a2-aa1fee6e7dcb'::uuid
      )
      or exists (
        select 1 from public.profiles
        where id = auth.uid()
          and role = 'master'
      )
      or lower(trim(coalesce(auth.jwt()->>'email', ''))) in (
        'willians.novais@pacecapital.com.br',
        'denis.beltrao@pacecapital.com.br'
      )
    ),
    false
  );
end;
$$ language plpgsql security definer set search_path = public stable;

revoke all on function public.is_master() from public, anon;
grant execute on function public.is_master() to authenticated;

-- 2. Bloquear execucao anonima e exigir autenticacao Master em obter_metricas_usabilidade_master()
create or replace function public.obter_metricas_usabilidade_master()
returns jsonb as $$
declare
  v_res jsonb;
begin
  if auth.uid() is null or public.is_master() is not true then
    raise exception 'Acesso negado: apenas usuarios Master autenticados podem consultar metricas de usabilidade.';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'id', coalesce(p.id, u.id),
      'email', coalesce(p.email, u.email),
      'full_name', coalesce(
        nullif(nullif(nullif(trim(p.full_name), ''), '-'), 'Assessor'),
        nullif(nullif(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), '-'), 'Assessor'),
        initcap(replace(split_part(coalesce(p.email, u.email, ''), '@', 1), '.', ' ')),
        'Assessor'
      ),
      'role', case
        when coalesce(p.id, u.id) in (
          '130e3598-89b9-4702-a4cc-2c5923fa3a66'::uuid,
          '5ec2da93-ed07-43f8-9089-6d285a092156'::uuid,
          '469dfeab-5fd6-4159-97a2-aa1fee6e7dcb'::uuid
        ) then 'master'
        when lower(trim(coalesce(p.email, u.email, ''))) in (
          'willians.novais@pacecapital.com.br',
          'denis.beltrao@pacecapital.com.br'
        ) then 'master'
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

revoke all on function public.obter_metricas_usabilidade_master() from public, anon;
grant execute on function public.obter_metricas_usabilidade_master() to authenticated;

-- 3. Bloquear execucao anonima em registrar_acesso_usuario()
create or replace function public.registrar_acesso_usuario()
returns void as $$
begin
  if auth.uid() is null then
    raise exception 'Acesso negado: usuario nao autenticado.';
  end if;

  update public.profiles
  set ultimo_acesso = now(),
      updated_at = now()
  where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.registrar_acesso_usuario() from public, anon;
grant execute on function public.registrar_acesso_usuario() to authenticated;

-- 4. Restaurar normalizacao dinamica de nomes e ultimo_acesso real em handle_new_user()
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_role text := 'assessor';
  v_email_norm text := lower(trim(coalesce(new.email, '')));
  v_full_name text;
begin
  if v_email_norm in (
    'willians.novais@pacecapital.com.br',
    'denis.beltrao@pacecapital.com.br'
  ) or new.id in (
    '130e3598-89b9-4702-a4cc-2c5923fa3a66'::uuid,
    '5ec2da93-ed07-43f8-9089-6d285a092156'::uuid,
    '469dfeab-5fd6-4159-97a2-aa1fee6e7dcb'::uuid
  ) then
    v_role := 'master';
  end if;

  v_full_name := coalesce(
    nullif(nullif(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), '-'), 'Assessor'),
    case
      when v_email_norm = 'willians.novais@pacecapital.com.br' then 'Willians Novais'
      when v_email_norm = 'denis.beltrao@pacecapital.com.br' then 'Denis Beltrao'
      else null
    end,
    nullif(trim(initcap(replace(split_part(v_email_norm, '@', 1), '.', ' '))), ''),
    'Assessor'
  );

  insert into public.profiles (id, email, full_name, role, ultimo_acesso, created_at, updated_at)
  values (
    new.id,
    new.email,
    v_full_name,
    v_role,
    new.last_sign_in_at,
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(
      nullif(nullif(nullif(trim(public.profiles.full_name), ''), '-'), 'Assessor'),
      excluded.full_name
    ),
    role = case
      when v_role = 'master' then 'master'
      else public.profiles.role
    end,
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Corrigir nomes genericos ('Assessor', '-' ou NULL) em public.profiles existentes
update public.profiles
set full_name = initcap(replace(split_part(lower(trim(email)), '@', 1), '.', ' ')),
    updated_at = now()
where (full_name is null or trim(full_name) in ('', '-', 'Assessor'))
  and email is not null
  and position('@' in email) > 1;

-- 6. Endurecer privilegios de tabela e coluna para bloquear role anon e escalonamento
revoke all on public.profiles from anon;
revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, ultimo_acesso, updated_at) on public.profiles to authenticated;

do $$
begin
  if to_regclass('public.relatorios') is not null then
    execute 'revoke all on public.relatorios from anon';
    execute 'grant select, insert, update, delete on public.relatorios to authenticated';
  end if;

  if to_regclass('public.suporte_chamados') is not null then
    execute 'revoke all on public.suporte_chamados from anon';
    execute 'grant select, insert, update on public.suporte_chamados to authenticated';
  end if;

  if to_regclass('public.invites') is not null then
    execute 'revoke all on public.invites from anon';
  end if;

  if to_regclass('public.audit_logs') is not null then
    execute 'revoke all on public.audit_logs from anon';
    execute 'grant select, insert on public.audit_logs to authenticated';
  end if;

  if to_regprocedure('public.solicitar_exclusao_meus_dados()') is not null then
    execute 'revoke all on function public.solicitar_exclusao_meus_dados() from public, anon';
    execute 'grant execute on function public.solicitar_exclusao_meus_dados() to authenticated';
  end if;
end $$;
