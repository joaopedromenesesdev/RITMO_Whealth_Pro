-- =============================================================================
-- MIGRAÇÃO DE ONBOARDING: USUÁRIOS DO PILOTO PACE CAPITAL (2026-10-19)
-- Whealth Planner Pro
-- Executável de forma idempotente no Supabase SQL Editor
-- =============================================================================

-- 1. Atualização defensiva do trigger handle_new_user() para normalização automática
-- de nomes corporativos dos assessores do piloto quando ativarem suas contas via convite
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_role text := 'assessor';
  v_full_name text;
begin
  -- Mapeamento automático dos assessores do piloto Pace Capital
  v_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    case lower(trim(new.email))
      when 'assessor.piloto1@pacecapital.com.br' then 'Assessor Piloto 1'
      when 'assessor.piloto2@pacecapital.com.br' then 'Assessor Piloto 2'
      when 'assessor.piloto3@pacecapital.com.br' then 'Assessor Piloto 3'
      when 'assessor.piloto4@pacecapital.com.br' then 'Assessor Piloto 4'
      when 'assessor.piloto5@pacecapital.com.br' then 'Assessor Piloto 5'
      else 'Assessor'
    end
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
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 2. Atualização preventiva caso os perfis já tenham sido criados com nome genérico
update public.profiles
set full_name = 'Assessor Piloto 1'
where lower(trim(email)) = 'assessor.piloto1@pacecapital.com.br' and (full_name is null or full_name = 'Assessor');

update public.profiles
set full_name = 'Assessor Piloto 2'
where lower(trim(email)) = 'assessor.piloto2@pacecapital.com.br' and (full_name is null or full_name = 'Assessor');

update public.profiles
set full_name = 'Assessor Piloto 3'
where lower(trim(email)) = 'assessor.piloto3@pacecapital.com.br' and (full_name is null or full_name = 'Assessor');

update public.profiles
set full_name = 'Assessor Piloto 4'
where lower(trim(email)) = 'assessor.piloto4@pacecapital.com.br' and (full_name is null or full_name = 'Assessor');

update public.profiles
set full_name = 'Assessor Piloto 5'
where lower(trim(email)) = 'assessor.piloto5@pacecapital.com.br' and (full_name is null or full_name = 'Assessor');

-- 3. Query administrativa para monitorar o status do piloto no SQL Editor
-- (Execute este bloco a qualquer momento para acompanhar quem já ativou a conta)
/*
select 
  u.id,
  u.email,
  coalesce(p.full_name, 'Pendente de Ativação') as nome_completo,
  coalesce(p.role, 'assessor') as perfil,
  u.invited_at,
  u.email_confirmed_at,
  u.last_sign_in_at,
  case 
    when u.last_sign_in_at is not null then 'Ativo (Já acessou)'
    when u.email_confirmed_at is not null then 'Confirmado (Senha criada)'
    else 'Pendente (Aguardando clique no e-mail)'
  end as status_piloto
from auth.users u
left join public.profiles p on p.id = u.id
where lower(u.email) in (
  'assessor.piloto1@pacecapital.com.br',
  'assessor.piloto2@pacecapital.com.br',
  'assessor.piloto3@pacecapital.com.br',
  'assessor.piloto4@pacecapital.com.br',
  'assessor.piloto5@pacecapital.com.br'
)
order by u.created_at desc;
*/
