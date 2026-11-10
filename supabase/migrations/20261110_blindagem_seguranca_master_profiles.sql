-- =============================================================================
-- MIGRACAO: BLINDAGEM DE SEGURANCA E ANTI-ESCALONAMENTO DE PRIVILEGIOS MASTER
-- Whealth Planner Pro (Pace Capital) - 2026-11-10
--
-- OBJETIVOS:
-- 1. Eliminar risco de escalonamento onde um usuario comum poderia alterar 'role'
--    ou 'email' na tabela public.profiles para se passar por Master.
-- 2. Corrigir public.is_master() para consultar e-mails apenas via token assinado auth.jwt().
-- 3. Trigger BEFORE UPDATE que impede terminantemente a alteracao de role, email ou id.
-- 4. Seguranca a nivel de coluna (Column-Level Security) no PostgreSQL.
-- =============================================================================

-- 1. FUNCAO public.is_master() 100% BLINDADA
create or replace function public.is_master()
returns boolean as $$
begin
  return (
    -- 1.1. UIDs fixos canonicos autorizados (Defesa em profundidade)
    auth.uid() in (
      '130e3598-89b9-4702-a4cc-2c5923fa3a66'::uuid,
      '5ec2da93-ed07-43f8-9089-6d285a092156'::uuid
    )
    -- 1.2. Papel 'master' validado no banco de dados (public.profiles)
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'master'
    )
    -- 1.3. E-mail verificado criptograficamente pelo servidor Supabase Auth (token JWT assinado)
    or lower(trim(coalesce(auth.jwt()->>'email', ''))) in (
      'willians.novais@pacecapital.com.br',
      'denis.beltrao@pacecapital.com.br'
    )
  );
end;
$$ language plpgsql security definer set search_path = public stable;

-- 2. TRIGGER BEFORE UPDATE PARA IMPEDIR AUTO-PROMOCAO E ALTERACAO DE E-MAIL
create or replace function public.trg_bloquear_escalonamento_privilegios()
returns trigger as $$
begin
  -- Se o usuario executor NAO for Master:
  if not public.is_master() then
    -- Bloqueio 1: Nao pode alterar a coluna 'role'
    if new.role is distinct from old.role then
      raise exception 'Acesso negado: usuarios comuns nao tem permissao para alterar a coluna role.';
    end if;

    -- Bloqueio 2: Nao pode alterar a coluna 'email' (deve sempre espelhar o cadastro em auth.users)
    if lower(trim(new.email)) is distinct from lower(trim(old.email)) then
      raise exception 'Acesso negado: nao e permitido alterar o e-mail do perfil de usuario.';
    end if;

    -- Bloqueio 3: Nao pode alterar o identificador (id)
    if new.id is distinct from old.id then
      raise exception 'Acesso negado: nao e permitido alterar o id do perfil.';
    end if;
  end if;

  -- Atualiza o carimbo de data
  new.updated_at := now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Associa o trigger a tabela public.profiles
drop trigger if exists trg_profiles_bloquear_escalonamento on public.profiles;
create trigger trg_profiles_bloquear_escalonamento
  before update on public.profiles
  for each row execute procedure public.trg_bloquear_escalonamento_privilegios();

-- 3. POLITICA RLS PARA UPDATE EM PUBLIC.PROFILES
drop policy if exists "Usuários podem atualizar seus próprios dados de perfil" on public.profiles;
create policy "Usuários podem atualizar seus próprios dados de perfil"
  on public.profiles for update
  using (auth.uid() = id or public.is_master())
  with check (auth.uid() = id or public.is_master());

-- 4. SEGURANCA A NIVEL DE COLUNA (Column-Level Privileges)
-- O client web autenticado so pode enviar atualizacoes para colunas seguras:
revoke update on public.profiles from authenticated;
grant update (full_name, ultimo_acesso, updated_at) on public.profiles to authenticated;
grant select on public.profiles to authenticated;

-- =============================================================================
-- CONSULTA DE AUDITORIA:
-- =============================================================================
select id, email, full_name, role, ultimo_acesso, created_at
from public.profiles
order by role desc, created_at asc;
