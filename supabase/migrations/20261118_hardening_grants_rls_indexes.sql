-- =============================================================================
-- MIGRACAO: HARDENING DE GRANTS, RLS, INDICES DE FK E TRIGGERS SECURITY DEFINER
-- Projeto Supabase: dogyopoylekiqsahadlc (Whealth Planner Pro - Pace Capital)
-- Data: 2026-11-18
-- Idempotente: Executavel com seguranca multiplas vezes sem quebra de regressao
--
-- OBJETIVOS (Zero Regressao nas Queries do Frontend):
-- 1. Garantir RLS habilitado e bloqueio completo da role anon nas tabelas alvo.
-- 2. Revogar privilegios excessivos (TRUNCATE, TRIGGER, REFERENCES, MAINTAIN) de
--    authenticated em public.audit_logs, public.relatorios,
--    public.suporte_chamados e public.profiles.
-- 3. Revogar UPDATE e DELETE de authenticated em public.audit_logs (append-only)
--    e revogar DELETE de authenticated em public.suporte_chamados.
-- 4. Corrigir a politica INSERT "Assessores podem registrar chamados de suporte"
--    em public.suporte_chamados para TO authenticated com
--    WITH CHECK ((select auth.uid()) = user_id).
-- 5. Criar indices IF NOT EXISTS cobrindo as foreign keys
--    public.relatorios(user_id) e public.master_admins(granted_by).
-- 6. Revogar EXECUTE de PUBLIC, anon e authenticated nas 4 funcoes de trigger
--    SECURITY DEFINER expostas em public.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. DEFESA EM PROFUNDIDADE: RLS HABILITADO E BLOQUEIO DE ROLE ANON
-- -----------------------------------------------------------------------------
alter table public.audit_logs enable row level security;
alter table public.relatorios enable row level security;
alter table public.suporte_chamados enable row level security;
alter table public.profiles enable row level security;

revoke all on table public.audit_logs from anon;
revoke all on table public.relatorios from anon;
revoke all on table public.suporte_chamados from anon;
revoke all on table public.profiles from anon;

-- -----------------------------------------------------------------------------
-- 2. REVOGAR PRIVILEGIOS EXCESSIVOS DE DDL/MANUTENCAO DA ROLE AUTHENTICATED
--    (Preserva SELECT/INSERT/UPDATE/DELETE necessarios ao frontend)
-- -----------------------------------------------------------------------------
revoke truncate, trigger, references, maintain on table public.audit_logs from authenticated;
revoke truncate, trigger, references, maintain on table public.relatorios from authenticated;
revoke truncate, trigger, references, maintain on table public.suporte_chamados from authenticated;
revoke truncate, trigger, references, maintain on table public.profiles from authenticated;

-- -----------------------------------------------------------------------------
-- 3. REVOGAR MUTACOES DESTRUTIVAS INDEVIDAS DA ROLE AUTHENTICATED
--    - public.audit_logs: append-only (preserva SELECT e INSERT)
--    - public.suporte_chamados: sem DELETE pelo cliente (preserva SELECT, INSERT, UPDATE)
-- -----------------------------------------------------------------------------
revoke update, delete on table public.audit_logs from authenticated;
revoke delete on table public.suporte_chamados from authenticated;

-- -----------------------------------------------------------------------------
-- 4. CORRIGIR POLITICA INSERT EM public.suporte_chamados
--    - Restringe explicitamente a role TO authenticated
--    - Otimiza auth.uid() via initplan (select auth.uid())
-- -----------------------------------------------------------------------------
drop policy if exists "Assessores podem registrar chamados de suporte" on public.suporte_chamados;
create policy "Assessores podem registrar chamados de suporte"
  on public.suporte_chamados
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- 5. CRIAR INDICES IF NOT EXISTS PARA FOREIGN KEYS SEM COBERTURA
-- -----------------------------------------------------------------------------
create index if not exists idx_relatorios_user_id
  on public.relatorios (user_id);

do $$
begin
  if to_regclass('public.master_admins') is not null then
    execute 'alter table public.master_admins enable row level security';
    execute 'revoke all on table public.master_admins from anon';
    execute 'create index if not exists idx_master_admins_granted_by on public.master_admins (granted_by)';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 6. REVOGAR EXECUTE DE PUBLIC, ANON E AUTHENTICATED NAS 4 FUNCOES DE TRIGGER
--    SECURITY DEFINER (triggers continuam disparando via engine interna)
-- -----------------------------------------------------------------------------
revoke execute on function public.fn_relatorios_audit_trigger() from public, anon, authenticated;
revoke execute on function public.fn_suporte_chamados_blindagem() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.trg_bloquear_escalonamento_privilegios() from public, anon, authenticated;
