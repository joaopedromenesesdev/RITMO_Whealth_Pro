-- =============================================================================
-- MIGRAÇÃO DE ONBOARDING: USUÁRIOS DO PILOTO PACE CAPITAL (2026-10-19)
-- Whealth Planner Pro
-- Arquitetura Zero-Leakage: Normalização dinâmica sem exposição de e-mails
-- Executável de forma idempotente no Supabase SQL Editor
-- =============================================================================

-- 1. Atualização defensiva do trigger handle_new_user() para normalização automática
-- de nomes corporativos dos assessores quando ativarem suas contas via convite
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_role text := 'assessor';
  v_full_name text;
begin
  v_full_name := coalesce(
    nullif(nullif(new.raw_user_meta_data->>'full_name', ''), '-'),
    initcap(replace(split_part(new.email, '@', 1), '.', ' ')),
    'Assessor'
  );

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    v_full_name,
    v_role
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(nullif(public.profiles.full_name, ''), '-'), excluded.full_name),
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 2. Atualização preventiva caso perfis já tenham sido criados com nome genérico
update public.profiles
set full_name = initcap(replace(split_part(email, '@', 1), '.', ' '))
where (full_name is null or full_name = 'Assessor' or full_name = '-')
  and email is not null;

-- 3. Query administrativa para monitorar o status no SQL Editor
/*
select 
  u.id,
  u.email,
  coalesce(p.full_name, initcap(replace(split_part(u.email, '@', 1), '.', ' '))) as nome_completo,
  coalesce(p.role, 'assessor') as perfil,
  u.invited_at,
  u.email_confirmed_at,
  u.last_sign_in_at
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at desc;
*/
